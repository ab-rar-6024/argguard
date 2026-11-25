import { isGroundableInText, normalizeText } from "./normalization.js";

/**
 * ExtractorChecker calls the Python inference service (if available),
 * projects source text into the tool's JSON schema, compares the extractor output
 * against the proposed arguments, and falls back cleanly to RuleChecker.
 */
export class ExtractorChecker {
  constructor(options = {}) {
    this.name = "ExtractorChecker";
    this.serviceUrl = options.serviceUrl || "http://127.0.0.1:8000";
    this.timeoutMs = options.timeoutMs || 2500;
  }

  /**
   * Compare proposed arguments with extractor's extracted arguments field by field
   * @param {Object} proposedArgs
   * @param {Object} extractedArgs
   * @returns {Object} verdicts map: 'GROUNDED' | 'MISMATCH' | 'UNSTATED'
   */
  compare(proposedArgs = {}, extractedArgs = {}) {
    const verdicts = {};

    for (const [key, propVal] of Object.entries(proposedArgs)) {
      if (propVal === null || propVal === undefined) {
        verdicts[key] = "UNSTATED";
        continue;
      }

      const extVal = extractedArgs ? extractedArgs[key] : null;

      if (extVal === null || extVal === undefined) {
        // Extractor returned null => unstated in text
        verdicts[key] = "UNSTATED";
      } else {
        // Compare with normalization
        const normProp = normalizeText(String(propVal));
        const normExt = normalizeText(String(extVal));

        if (normProp === normExt || isGroundableInText(propVal, String(extVal))) {
          verdicts[key] = "GROUNDED";
        } else {
          // Values exist in both, but differ!
          verdicts[key] = "MISMATCH";
        }
      }
    }

    return verdicts;
  }

  /**
   * Calls the FastAPI /extract endpoint
   */
  async callService(schema, text) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.serviceUrl}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, text }),
        signal: controller.signal
      });

      if (!res.ok) {
        return { status: "unavailable", latencyMs: 0 };
      }

      const data = await res.json();
      return data;
    } catch (err) {
      // Offline / connection refused / timed out
      return { status: "unavailable", latencyMs: 0, error: err.message };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Check arguments
   */
  async check(args = {}, sources = [], toolSchema = null) {
    if (!Array.isArray(sources) || sources.length === 0) {
      const verdicts = {};
      for (const k of Object.keys(args)) verdicts[k] = "UNCHECKED";
      return { verdicts, degraded: false, latencyMs: 0 };
    }

    const combinedText = sources.map((s) => s.text || "").join("\n");
    const serviceRes = await this.callService(toolSchema || { type: "object" }, combinedText);

    if (serviceRes.status === "ok" && serviceRes.json_output) {
      const verdicts = this.compare(args, serviceRes.json_output);
      return {
        verdicts,
        degraded: false,
        latencyMs: serviceRes.latency_ms,
        extracted: serviceRes.json_output
      };
    }

    // Clean degradation: Return null verdicts so caller falls back to RuleChecker
    return {
      verdicts: null,
      degraded: true,
      latencyMs: serviceRes.latency_ms || 0,
      reason: serviceRes.error || "Service unavailable"
    };
  }
}
