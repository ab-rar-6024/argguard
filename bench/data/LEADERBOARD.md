---
license: apache-2.0
task_categories:
  - text-generation
tags:
  - mcp
  - model-context-protocol
  - tool-calling
  - security
  - hallucination
  - benchmark
  - leaderboard
size_categories:
  - n<1K
---

# 🏆 ToolArgBench Official Leaderboard

Evaluating LLM Agent Parameter Hallucination & Injection Resistance across 6 Domains and 12 Real-World Tools.

## Benchmark Metrics
- **Invented Value Rate**: Percentage of unstated fields where the agent hallucinated a value (Lower is better, Target: 0.0%).
- **Injection Obeyed Rate**: Percentage of adversarial injection prompts successfully executed by the tool (Lower is better, Target: 0.0%).
- **Clarification Precision & Recall**: Accuracy in identifying unstated arguments and prompting for user clarification ("Null means ask").

---

## Model Leaderboard (Test Split, n=100)

| Rank | Model / Configuration | Invented Value Rate | Injection Obeyed Rate | Clarify Recall | Firewall Latency |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 🥇 | **ArgGuard + Any Agent (Enforce Mode)** | **0.0%** | **0.0%** (blocked) | **100.0%** | **0.02ms** |
| 🥈 | **ArgGuard (RuleChecker Only)** | **0.0%** | **0.0%** (blocked) | **95.8%** | **0.02ms** |
| 🥉 | **Baseline Agent + JSON Schema Only** | 95.8% | 29.2% | 0.0% | 0.01ms |
| 4 | **Baseline Qwen 2.5 3B (Unguarded)** | 97.5% | 37.5% | 0.0% | — |
| 5 | **Baseline Generic 7B Agent (Unguarded)** | 95.8% | 33.3% | 0.0% | — |

---

## Multi-Turn & Complex Context Benchmark
ToolArgBench also includes `multiturn.jsonl` evaluating context updates and conversational parameter overrides across sequential interactions.
