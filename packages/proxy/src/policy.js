/**
 * Policy Engine mapping tool risk levels and argument verdicts to firewall actions.
 * Actions:
 * - 'allow': call is forwarded to target MCP server
 * - 'ask': clarification required; missing or ungrounded fields are returned to agent
 * - 'confirm': user/caller confirmation required
 * - 'block': call is denied
 */

export const DEFAULT_POLICY = {
  default_risk: "medium",
  tools: {},
  rules: {
    on_unstated: {
      low: "ask",
      medium: "ask",
      high: "ask"
    },
    on_mismatch: {
      low: "ask",
      medium: "ask",
      high: "ask"
    },
    on_injection: {
      low: "confirm",
      medium: "confirm",
      high: "block"
    }
  }
};

export class PolicyEngine {
  constructor(policyConfig = DEFAULT_POLICY) {
    this.config = policyConfig;
  }

  getToolRisk(toolName) {
    if (this.config.tools?.[toolName]?.risk) {
      return this.config.tools[toolName].risk;
    }
    return this.config.default_risk || "medium";
  }

  /**
   * Evaluates verdicts and determines action
   * @param {string} toolName
   * @param {Object} verdicts - map of field -> verdict
   * @returns {Object} { action: 'allow' | 'ask' | 'confirm' | 'block', clarifyFields: string[], reason: string }
   */
  evaluate(toolName, verdicts = {}) {
    const risk = this.getToolRisk(toolName);
    const unstatedFields = [];
    const mismatchFields = [];
    let hasInjection = false;

    for (const [field, verdict] of Object.entries(verdicts)) {
      if (verdict === "INJECTION_SUSPECT") {
        hasInjection = true;
      } else if (verdict === "UNSTATED") {
        unstatedFields.push(field);
      } else if (verdict === "MISMATCH") {
        mismatchFields.push(field);
      }
    }

    // 1. Injection takes highest precedence
    if (hasInjection) {
      const action = this.config.rules?.on_injection?.[risk] || "confirm";
      return {
        action,
        clarifyFields: [],
        reason: `Potential prompt injection detected in parameters for ${risk}-risk tool ${toolName}`
      };
    }

    // 2. Mismatches (extractor vs proposed)
    if (mismatchFields.length > 0) {
      const action = this.config.rules?.on_mismatch?.[risk] || "ask";
      return {
        action,
        clarifyFields: mismatchFields,
        reason: `Mismatched values detected for fields: ${mismatchFields.join(", ")}`
      };
    }

    // 3. Unstated arguments ("null means ask")
    if (unstatedFields.length > 0) {
      const action = this.config.rules?.on_unstated?.[risk] || "ask";
      return {
        action,
        clarifyFields: unstatedFields,
        reason: `Unstated or ungrounded values for fields: ${unstatedFields.join(", ")}`
      };
    }

    // 4. Default: all grounded or unchecked
    return {
      action: "allow",
      clarifyFields: [],
      reason: "All parameters grounded or verified"
    };
  }
}
