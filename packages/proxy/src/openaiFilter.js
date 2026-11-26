import { RuleChecker } from "./ruleChecker.js";
import { InjectionChecker } from "./injectionChecker.js";
import { PolicyEngine, DEFAULT_POLICY } from "./policy.js";
import { validateSchema } from "./schemaValidator.js";

/**
 * OpenAI / Anthropic format function call filter.
 * Validates OpenAI tool_calls: [{ id, type: 'function', function: { name, arguments } }]
 */
export class OpenAIToolFilter {
  constructor(options = {}) {
    this.ruleChecker = new RuleChecker();
    this.injectionChecker = new InjectionChecker();
    this.policyEngine = new PolicyEngine(options.policy || DEFAULT_POLICY);
    this.mode = options.mode || "enforce";
  }

  /**
   * Filter an array of proposed tool calls
   * @param {Array} toolCalls - OpenAI function call items
   * @param {Array} sources - list of source texts/documents
   * @param {Map|Object} toolSchemas - map of tool_name -> JSON schema
   * @returns {Object} { allowed: boolean, results: Array }
   */
  filter(toolCalls = [], sources = [], toolSchemas = {}) {
    const results = [];
    let allAllowed = true;

    for (const call of toolCalls) {
      const toolName = call.function?.name;
      let args = {};
      try {
        args = typeof call.function?.arguments === "string" 
          ? JSON.parse(call.function.arguments) 
          : call.function?.arguments || {};
      } catch (e) {
        results.push({
          callId: call.id,
          tool: toolName,
          action: "block",
          reason: "Invalid arguments JSON string"
        });
        allAllowed = false;
        continue;
      }

      const schema = toolSchemas[toolName];
      let schemaErrors = [];
      if (schema) {
        const v = validateSchema(schema, args);
        if (!v.valid) schemaErrors = v.errors;
      }

      // Check Rule & Injection
      const ruleRes = this.ruleChecker.check(args, sources, schema);
      const injRes = this.injectionChecker.check(args, sources);
      const verdicts = { ...ruleRes.verdicts, ...injRes.verdicts };
      const pol = this.policyEngine.evaluate(toolName, verdicts);

      const isBlocked = schemaErrors.length > 0 || pol.action === "block";
      const isClarify = pol.action === "ask" || pol.action === "confirm";

      if (isBlocked || isClarify) {
        allAllowed = false;
      }

      results.push({
        callId: call.id,
        tool: toolName,
        action: schemaErrors.length > 0 ? "block" : pol.action,
        clarifyFields: pol.clarifyFields,
        schemaErrors,
        verdicts
      });
    }

    return { allowed: allAllowed, results };
  }
}
