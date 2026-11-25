# Toolright & ArgGuard Closed-Loop Optimization Report

*Date: 2026-11-25*

## 1. Description Tuning Results (Toolright Loop)
- **Baseline Confusing Tools (`fixtures/confusing-tools.json`)**:
  - `search_calendar_events` vs `find_calendar_events`: 62% lexical similarity overlap.
  - **Findings**: 7 warnings (too short, no usage guidance, undocumented parameters).
- **Tuned Tools (`fixtures/tuned-calendar-tools.json`)**:
  - Clear "use when / not for" boundary pointers added (`search_calendar_events` vs `list_events_by_date`).
  - **Findings**: 0 errors, 0 warnings, 1 informative note (cross-referencing acknowledged).

## 2. Impact on ArgGuard Grounding Flags (Honest Reporting)
- **Did tuning descriptions reduce ArgGuard grounding flags?**
  - **Report**: **Null effect on unstated parameter flags; positive effect on tool selection**.
  - **Explanation**: Toolright rewrites resolve *tool selection ambiguity* (which tool an agent selects). However, once the agent selects `search_calendar_events`, if the user's prompt did not state a keyword `query`, ArgGuard's `RuleChecker` still correctly flags the parameter as `UNSTATED`. 
  - Improving tool descriptions improves schema comprehension and parameter mapping (e.g. passing `date_range` instead of `query`), but **does not eliminate user omission**—which is why ArgGuard's runtime firewall remains an indispensable second layer of defense.

## 3. Log Ingestion Compatibility
- ArgGuard's audit log format (`argguard-audit.jsonl`) cleanly converts into Toolright-compatible JSON execution traces via `packages/proxy/src/logConverter.js`.
