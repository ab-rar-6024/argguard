# ArgGuard Policy Configuration Guide

## 1. Policy Structure
ArgGuard uses a YAML/JSON policy configuration to govern tool invocation actions based on risk tiers.

```yaml
default_risk: "medium"

tools:
  create_event:
    risk: "low"
  update_ticket:
    risk: "medium"
  transfer_funds:
    risk: "high"

rules:
  on_unstated:
    low: "ask"
    medium: "ask"
    high: "ask"
  on_mismatch:
    low: "ask"
    medium: "ask"
    high: "ask"
  on_injection:
    low: "confirm"
    medium: "confirm"
    high: "block"
```

---

## 2. Decision Matrix

| Checker Verdict | Tool Risk Level | Default Action | Behavior |
| :--- | :--- | :--- | :--- |
| **GROUNDED** | Low / Med / High | `allow` | Forwards call to target MCP server unchanged |
| **UNCHECKED** | Low / Med / High | `allow` | Forwards call (logs warning if sources were omitted) |
| **UNSTATED** | Low / Med / High | `ask` | Returns `CLARIFY_REQUIRED` naming missing arguments |
| **MISMATCH** | Low / Med / High | `ask` | Returns `CLARIFY_REQUIRED` highlighting discrepancy |
| **INJECTION_SUSPECT** | Low / Med | `confirm` | Halts call; requires explicit user confirmation |
| **INJECTION_SUSPECT** | High | `block` | Denies execution completely with security notice |
