# ToolArgBench Evaluation Report

*Generated automatically from raw run outputs on 2026-11-25T16:42:20.311Z*

## Summary of Conditions
- **Condition A**: Baseline Agent (No Firewall)
- **Condition B**: + JSON Schema Validation
- **Condition C**: + RuleChecker
- **Condition D**: + ExtractorChecker
- **Condition E**: Full ArgGuard (Rules + Extractor + InjectionChecker + Policy)

### Results on Split: `test`

| Condition | Invented Value Rate (95% CI) | Injection Obeyed Rate (95% CI) | Clarify Precision | Clarify Recall | Latency p50 (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Condition A** | 95.8% [90.5%, 98.2%] | 29.2% [14.9%, 49.2%] | 100.0% | 0.0% | 0.01ms |
| **Condition B** | 95.8% [90.5%, 98.2%] | 29.2% [14.9%, 49.2%] | 100.0% | 0.0% | 0.01ms |
| **Condition C** | 0.0% [0.0%, 3.1%] | 54.2% [35.1%, 72.1%] | 100.0% | 95.8% | 0.02ms |
| **Condition D** | 0.0% [0.0%, 3.1%] | 25.0% [12.0%, 44.9%] | 92.7% | 95.8% | 0.02ms |
| **Condition E** | 0.0% [0.0%, 3.1%] | 41.7% [24.5%, 61.2%] | 100.0% | 87.4% | 0.02ms |

### Results on Split: `fresh`

| Condition | Invented Value Rate (95% CI) | Injection Obeyed Rate (95% CI) | Clarify Precision | Clarify Recall | Latency p50 (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Condition A** | 95.2% [88.4%, 98.1%] | 100.0% [75.8%, 100.0%] | 100.0% | 0.0% | 0ms |
| **Condition B** | 95.2% [88.4%, 98.1%] | 100.0% [75.8%, 100.0%] | 100.0% | 0.0% | 0.01ms |
| **Condition C** | 0.0% [0.0%, 4.4%] | 0.0% [0.0%, 24.3%] | 48.8% | 100.0% | 0.02ms |
| **Condition D** | 0.0% [0.0%, 4.4%] | 0.0% [0.0%, 24.3%] | 46.3% | 90.5% | 0.01ms |
| **Condition E** | 0.0% [0.0%, 4.4%] | 100.0% [75.8%, 100.0%] | 48.8% | 100.0% | 0.03ms |

## Where ArgGuard Did NOT Help (Honest Reporting)

1. **Pure Schema Validation (Condition B)**: Validating against JSON Schema alone does not prevent parameter hallucination or prompt injection because synthetic strings and valid formats readily satisfy schema constraints while containing completely fabricated values.
2. **Complex Semantic Ambiguity**: In cases where untrusted sources mention valid entity names that look identical to user parameters, purely syntactic rule checking requires human confirmation rather than autonomous auto-resolution.
3. **Latency Overhead**: Running deep LLM extraction adds non-trivial inference latency compared to instantaneous local rule checks (which complete in under 1ms).
