# Contributing to ArgGuard

Thank you for your interest in contributing to ArgGuard!

## Development Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/ab-rar-6024/argguard.git
   cd argguard
   ```
2. Install dependencies and run tests:
   ```bash
   npm test
   ```
3. Generate benchmark datasets:
   ```bash
   node bench/gen/generate.js
   ```

## Rules of Engagement
- **Honest Reporting**: All reported metrics must stem from reproducible runs.
- **Strict Grounding**: ArgGuard wraps downstream servers without modifying their code.
- **Pre-Registration**: Any changes to benchmark metrics or decision logic must be amended in `bench/PREREGISTRATION.md` before evaluation.
