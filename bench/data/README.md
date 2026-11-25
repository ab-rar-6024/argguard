---
license: apache-2.0
task_categories:
  - text-generation
  - question-answering
tags:
  - mcp
  - model-context-protocol
  - tool-calling
  - security
  - hallucination
size_categories:
  - n<1K
---

# ToolArgBench: Grounding & Injection Benchmark for MCP Tool Calling

ToolArgBench is a rigorous evaluation benchmark assessing whether LLM agents accurately ground tool call parameters in source documents or invent unstated arguments and fall prey to parameter-level prompt injection.

## Dataset Structure
- **Domains**: Calendar, Messaging, Ticketing, Payments, Cloud Compute, Access Control (12 total tools).
- **Splits**:
  - `train.jsonl` (200 rows)
  - `dev.jsonl` (100 rows)
  - `test.jsonl` (100 rows)
  - `fresh.jsonl` (50 hand-curated out-of-distribution rows)
- **Integrity**: SHA-256 tracked in `stats.json` (Seed `20261125`).

## Fields
- `id`: unique case identifier
- `tool`: target tool name
- `domain`: operational domain
- `inputSchema`: JSON Schema of the target tool
- `source`: `{ id, trust, text }`
- `statedFields`: list of parameters mentioned in text
- `groundTruth`: record with null for unstated fields
- `isInjection`: boolean indicating adversarial payload presence
