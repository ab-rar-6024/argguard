# ArgGuard Architecture & Specification

## 1. Core Architecture
ArgGuard consists of four modular subsystems:

1. **Proxy Server (`packages/proxy/src/proxy.js`)**:
   - Stdio MCP server implementing child process spawning and tool mirroring (`tools/list`).
   - Intercepts `tools/call`, runs schema validation, validates sources, coordinates checker chain, and applies policy.
2. **Grounding Checker Chain**:
   - `RuleChecker`: Zero-model offline presence checking with normalization (numbers, dates, whitespace, case).
   - `ExtractorChecker`: Calls local FastAPI service (`schema-json-extractor-4B`), projects schema, and compares extracted vs proposed parameters.
   - `InjectionChecker`: Scans untrusted sources for imperative prompts and tracks argument provenance.
3. **Policy Engine (`packages/proxy/src/policy.js`)**:
   - Maps risk tiers and verdict combinations to deterministic actions (`allow`, `ask`, `confirm`, `block`).
4. **Audit Logger (`packages/proxy/src/audit.js`)**:
   - Append-only JSONL log with secret scrubbing, ANSI stripping, and full Toolright log compatibility.

---

## 2. Attaching Sources Convention
Callers provide source context using the MCP request `_meta` field:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_event",
    "arguments": {
      "title": "Strategy Sync",
      "start_time": "2026-11-28T10:00:00"
    },
    "_meta": {
      "argguard": {
        "sources": [
          { "id": "email-42", "trust": "user", "text": "Schedule Strategy Sync for 2026-11-28T10:00:00" }
        ]
      }
    }
  }
}
```
If `_meta.argguard.sources` is omitted, the call is evaluated as `UNCHECKED`, validated against schema, and logged.
