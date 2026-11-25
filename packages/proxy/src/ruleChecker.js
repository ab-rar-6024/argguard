import { isGroundableInText } from "./normalization.js";

/**
 * RuleChecker evaluates whether proposed arguments are grounded in the source segments.
 * Argument status classifications:
 * - GROUNDED: clearly present in at least one source segment
 * - UNSTATED: completely absent from all source segments
 * - UNCHECKED: no source segments were provided
 */
export class RuleChecker {
  constructor(options = {}) {
    this.name = "RuleChecker";
  }

  /**
   * Check proposed arguments against sources
   * @param {Object} args - tool call arguments
   * @param {Array} sources - list of { id, text, trust }
   * @param {Object} toolSchema - JSON schema of the tool
   * @returns {Object} { verdicts: { [field]: 'GROUNDED' | 'UNSTATED' | 'UNCHECKED' } }
   */
  check(args = {}, sources = [], toolSchema = null) {
    const verdicts = {};

    if (!Array.isArray(sources) || sources.length === 0) {
      for (const k of Object.keys(args)) {
        verdicts[k] = "UNCHECKED";
      }
      return { verdicts };
    }

    // Combine all trusted and untrusted source text for rule checking
    const combinedSourceText = sources.map((s) => s.text || "").join("\n");

    for (const [key, value] of Object.entries(args)) {
      if (value === null || value === undefined) {
        verdicts[key] = "UNSTATED";
        continue;
      }

      const grounded = isGroundableInText(value, combinedSourceText);
      verdicts[key] = grounded ? "GROUNDED" : "UNSTATED";
    }

    // Check if required fields in schema are missing entirely from args
    if (toolSchema?.required && Array.isArray(toolSchema.required)) {
      for (const reqField of toolSchema.required) {
        if (args[reqField] === undefined || args[reqField] === null) {
          verdicts[reqField] = "UNSTATED";
        }
      }
    }

    return { verdicts };
  }
}
