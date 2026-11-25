import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isGroundableInText } from "./normalization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class InjectionChecker {
  constructor(options = {}) {
    this.name = "InjectionChecker";
    this.patternsPath = options.patternsPath || join(__dirname, "../data/injection_patterns.json");
    this.loadPatterns();
  }

  loadPatterns() {
    try {
      const content = readFileSync(this.patternsPath, "utf8");
      const list = JSON.parse(content);
      this.patterns = list.map((item) => ({
        ...item,
        regex: new RegExp(item.pattern, "i")
      }));
    } catch (err) {
      this.patterns = [];
    }
  }

  /**
   * Find all injection spans in a piece of untrusted text
   * @param {string} text
   * @returns {Array<{ id: string, span: string, start: number, end: number }>}
   */
  findInjectionSpans(text) {
    if (!text || typeof text !== "string") return [];
    const spans = [];

    for (const pat of this.patterns) {
      const match = text.match(pat.regex);
      if (match && match.index !== undefined) {
        // Extract a sentence or window around the match
        const start = Math.max(0, match.index - 20);
        const end = Math.min(text.length, match.index + match[0].length + 150);
        spans.push({
          id: pat.id,
          description: pat.description,
          span: text.slice(start, end),
          matchedText: match[0],
          start,
          end
        });
      }
    }

    return spans;
  }

  /**
   * Checks provenance: is the argument value ONLY found within an injection span in untrusted sources?
   * @param {Object} args
   * @param {Array<{ id: string, trust: string, text: string }>} sources
   * @returns {Object} { verdicts: { [field]: 'INJECTION_SUSPECT' | null }, flaggedSpans: Array }
   */
  check(args = {}, sources = []) {
    const verdicts = {};
    const flaggedSpans = [];

    if (!Array.isArray(sources) || sources.length === 0) {
      return { verdicts, flaggedSpans };
    }

    // Separate trusted vs untrusted sources
    const trustedText = sources
      .filter((s) => s.trust === "user" || s.trust === "trusted")
      .map((s) => s.text || "")
      .join("\n");

    const untrustedSources = sources.filter((s) => s.trust === "untrusted" || !s.trust);

    // Identify injection spans across untrusted documents
    const allInjectionSpans = [];
    for (const src of untrustedSources) {
      const found = this.findInjectionSpans(src.text || "");
      if (found.length > 0) {
        allInjectionSpans.push(...found);
      }
    }

    flaggedSpans.push(...allInjectionSpans);

    // For each argument, check provenance
    for (const [field, val] of Object.entries(args)) {
      if (val === null || val === undefined) continue;

      // 1. If it appears in trusted text, it is not an injection suspect
      if (trustedText && isGroundableInText(val, trustedText)) {
        continue;
      }

      // 2. Check if the value appears inside ANY identified hostile injection span
      let foundInInjectionSpan = false;
      for (const spanObj of allInjectionSpans) {
        if (isGroundableInText(val, spanObj.span)) {
          foundInInjectionSpan = true;
          break;
        }
      }

      // 3. Check if the argument value ITSELF contains an injection phrase
      if (typeof val === "string") {
        for (const pat of this.patterns) {
          if (pat.regex.test(val)) {
            foundInInjectionSpan = true;
            break;
          }
        }
      }

      if (foundInInjectionSpan) {
        verdicts[field] = "INJECTION_SUSPECT";
      }
    }

    return { verdicts, flaggedSpans };
  }
}
