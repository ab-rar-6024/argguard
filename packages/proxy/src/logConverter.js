import { readFileSync, writeFileSync } from "node:fs";

/**
 * Converts ArgGuard JSONL audit logs into Toolright execution traces.
 * Standardizes schema format:
 * - timestamp
 * - tool
 * - arguments
 * - status: 'success' | 'clarify_required' | 'blocked' | 'error'
 * - schemaValid: boolean
 * - latencyMs: number
 */
export function convertArgGuardLogsToToolright(inputLogPath, outputTracePath) {
  const lines = readFileSync(inputLogPath, "utf8").trim().split("\n");
  const traces = [];

  for (const l of lines) {
    if (!l.trim()) continue;
    const r = JSON.parse(l);

    traces.push({
      timestamp: r.timestamp || new Date().toISOString(),
      toolName: r.tool,
      arguments: r.arguments || {},
      status: r.actionTaken === "ask" ? "clarify_required" : r.actionTaken === "block" ? "blocked" : "success",
      schemaValid: r.schemaValid !== false,
      groundingVerdicts: r.verdicts || {},
      latencyMs: r.latencyMs || 0
    });
  }

  writeFileSync(outputTracePath, JSON.stringify(traces, null, 2) + "\n", "utf8");
  return traces;
}
