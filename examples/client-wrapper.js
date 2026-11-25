/**
 * Reference client wrapper demonstrating how an LLM agent attaches source segments
 * to standard MCP tools/call requests for ArgGuard grounding verification.
 */
export function buildGroundedToolCall(id, toolName, args, sources = []) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
      _meta: {
        argguard: {
          sources: sources.map((s, idx) => ({
            id: s.id || `source-${idx + 1}`,
            trust: s.trust || "untrusted", // 'user' | 'trusted' | 'untrusted'
            text: s.text || ""
          }))
        }
      }
    }
  };
}
