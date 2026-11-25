# ArgGuard: Open-Source MCP Tool-Call Grounding Firewall

[![CI](https://github.com/ab-rar-6024/argguard/actions/workflows/ci.yml/badge.svg)](https://github.com/ab-rar-6024/argguard/actions)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version: 0.1.0](https://img.shields.io/badge/version-0.1.0-green.svg)](package.json)

> **ArgGuard** is a transparent stdio firewall proxy that intercepts LLM agent `tools/call` requests to Model Context Protocol (MCP) servers, verifies argument grounding in source documents ("null means ask"), detects parameter prompt injection, and prevents hallucinated tool invocations.

---

## ⚠️ Limitations & Non-Goals (Read First)
Before deploying ArgGuard, understand what it does and does not protect against:
1. **Attacker Control Over Trusted Sources**: ArgGuard validates parameter grounding against provided source segments. If an attacker controls or poisons a source marked `trust: "user"`, ArgGuard treats values grounded in that document as legitimate.
2. **Not a General Conversational Guardrail**: ArgGuard protects tool parameters (`tools/call`); it does not monitor raw conversational chat responses sent directly to users without tool invocations.
3. **Evolving Injection Heuristics**: Heuristic injection patterns are a defense-in-depth layer, not an immutable formal proof against obfuscated adversarial wording.
4. **Offline Rule Mode vs Full Extractor**: Offline `RuleChecker` runs in under 1ms with zero dependencies; deep model extraction (`schema-json-extractor-4B`) requires dedicated GPU resources.

---

## 📊 Benchmark Results (ToolArgBench)
All numbers below originate from actual runs recorded in [`bench/results/`](bench/results/):

### Held-Out Test Split (100 cases, 12 tools across 6 domains)
| Condition | Invented Value Rate (95% CI) | Injection Obeyed Rate (95% CI) | Clarify Precision | Clarify Recall | Latency p50 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Condition A (Baseline)** | 95.8% [90.5%, 98.2%] | 29.2% [14.9%, 49.2%] | 100.0% | 0.0% | 0.01ms |
| **Condition B (+ Schema)** | 95.8% [90.5%, 98.2%] | 29.2% [14.9%, 49.2%] | 100.0% | 0.0% | 0.01ms |
| **Condition C (+ Rules)** | 0.0% [0.0%, 3.1%] | 54.2% [35.1%, 72.1%] | 100.0% | 95.8% | 0.02ms |
| **Condition D (+ Extractor)** | 0.0% [0.0%, 3.1%] | 25.0% [12.0%, 44.9%] | 92.7% | 95.8% | 0.02ms |
| **Condition E (Full ArgGuard)** | **0.0% [0.0%, 3.1%]** | **41.7% [24.5%, 61.2%]** | **100.0%** | **87.4%** | **0.02ms** |

*Detailed run report available at [`bench/results/REPORT.md`](bench/results/REPORT.md).*

---

## 🚀 60-Second Quick Start

### 1. Install & Run Proxy
Wrap any existing stdio MCP server command with `argguard`:
```bash
npx argguard run --mode enforce -- node my-mcp-server.js
```

### 2. Pass Source Context in Agent Calls
Instruct your agent client to pass source segments in `_meta.argguard.sources`:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_event",
    "arguments": {
      "title": "Quarterly Strategy",
      "date": "2026-11-30"
    },
    "_meta": {
      "argguard": {
        "sources": [
          { "id": "doc1", "trust": "user", "text": "Schedule Quarterly Strategy for 2026-11-30." }
        ]
      }
    }
  }
}
```

### 3. Handle Clarification Responses
If the agent guesses or leaves an argument unstated, ArgGuard halts the call:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[ArgGuard Clarify Required] The following argument(s) were unstated: location. Please provide them."
      }
    ],
    "isError": true,
    "_argguard": { "status": "CLARIFY_REQUIRED", "fields": ["location"] }
  }
}
```

---

## 🛠️ Architecture & Documentation
- [Architecture & Design](docs/ARCHITECTURE.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Policy Configuration Guide](docs/POLICY_GUIDE.md)
- [Toolright Closed-Loop Tuning](docs/TOOLRIGHT_LOOP.md)
- [Reference Client Wrapper](examples/client-wrapper.js)
- [Interactive Grounding UI](examples/demo-ui.html)
- [Evaluation Pre-Registration](bench/PREREGISTRATION.md)

---

## 📜 License
Apache-2.0 License. See [LICENSE](LICENSE).
