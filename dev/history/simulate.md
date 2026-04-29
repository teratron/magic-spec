# Simulation Workflow History

| Version | Date | Description |
| :--- | :--- | :--- |
| 1.0.0 | 2026-02-23 | Initial migration from workflow-enhancements.md |
| 1.3.0 | 2026-02-25 | Added pre-flight check, archival clarification |
| 1.3.1 | 2026-02-26 | Added pre-flight Step 0, fixed checklist indentation |
| 1.3.1 | 2026-02-27 | Stress-test fix: checksums_mismatch upgraded to HALT |
| 1.3.1 | 2026-02-27 | Added Test Suite mode: `/magic.simulate test` |
| 1.3.2 | 2026-02-28 | Added Improv Mode (Live Simulation) and fallback |
| 1.3.2 | 2026-02-28 | Test Automation Loop: enforced adding new tests |
| 1.3.2 | 2026-02-28 | Enforced Regression Sweep sweep after fixes |
| 1.3.2 | 2026-02-28 | Dynamic Default target: triggers Improv Mode automatically |
| 1.4.9 - 1.4.146 | 2026-03-05 | Automated update via engine meta automation |
| 1.4.149 | 2026-03-09 | Add Argument Routing, Mode D (Focused Analysis), Structural Integrity, Advisory Report, Scope Blind-Spot Check, exact string match in Registry Audit, C15 exception for Mode D |
| 1.4.150 | 2026-03-09 | Add C14 Enforcement Gate as blocking step in Reporting & Fixes |
| 1.4.151 | 2026-03-09 | Clarify session scope, update mermaid diagram with C14 Gate and Succession loop, add max 2-round guard, document file-path argument support, update checklist to blocking semantics |
| 1.4.152 | 2026-03-09 | Add regression tests T128-T130 for C14 Gate, Succession guard, file-path routing |
| 1.4.153 | 2026-03-09 | Formalize Improv Mode multi-workspace scope and Suite Integrity structural requirements |
| 1.4.156 - 1.4.160 | 2026-03-10 | Automated update via engine meta automation |
| 1.4.163 | 2026-03-13 | Removed onboard workflow and all related traces |
| 1.4.166 - 1.5.38 | 2026-03-20 | Automated update via engine meta automation |
| 1.5.40 | 2026-03-20 | Add regression tests T164-T166 for spec.md audit fixes (dispatch conflict HALT, delta-editing enforcement, RESCUE Levenshtein) |
| 1.5.41 - 1.5.47 | 2026-03-24 | Automated update via engine meta automation |
| 1.5.48 | 2026-03-24 | Finalizing engine refinement and version sync to 1.5.47 |
| 1.5.55 - 1.5.78 | 2026-03-31 | Automated update via engine meta automation |
| 1.5.79 | 2026-03-31 | Cross-workspace parent header parity guards and T177 test case |
| 1.5.81 - 1.5.112 | 2026-04-02 | Automated update via engine meta automation |
| 1.5.117 | 2026-04-02 | Engine optimization: Smart History dedup, gitignore parsing, context-resolution consolidation, template normalization |
| 1.5.125 - 1.5.199 | 2026-04-25 | Automated update via engine meta automation |
| 1.5.200 | 2026-04-25 | Refactor: exclude history/ from .checksums; restrict history to root workflow files only |
| 2.0.6 - 2.0.11 | 2026-04-29 | Automated update via engine meta automation |
| 2.0.12 | 2026-04-29 | Engine: removed `.magic/simulate.md` from shipped layer; full implementation lives only in `.agents/workflows/magic.dev.simulate.md` (dev-tier). |
