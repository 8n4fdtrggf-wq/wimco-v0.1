---
target: startsida och rapport
total_score: 27
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 2
target_identity: "file:/home/claude/wimco-v0.1/public/index.html"
target_fingerprint: "sha256:f7cd9709cf33a8fef7622509b40a0ed324df9f75d56e2a48c530bb06218694fc"
target_path: /home/claude/wimco-v0.1/public/index.html
timestamp: 2026-09-30T16-21-16Z
slug: public-index-html
---
Method: dual-agent (A: adeb8bd97d50ce96a · B: a15bd7f5fa8064d9b)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 4 | Stations lit by real steps, live region |
| 2 | Match System / Real World | 3 | Transit metaphor never named |
| 3 | User Control and Freedom | 3 | No way to cancel a running scan |
| 4 | Consistency and Standards | 3 | Analysis CTA navy in Score section, orange elsewhere |
| 5 | Error Prevention | 3 | Tolerant input |
| 6 | Recognition Rather Than Recall | 3 | Two similar tab rows mean different things |
| 7 | Flexibility and Efficiency | n/a | Persuade surface |
| 8 | Aesthetic and Minimalist Design | 2 | Long page; report repeats help CTA per category |
| 9 | Error Recovery | 3 | Blocked/404/SSRF states with actions |
| 10 | Help and Documentation | 3 | Method page and "Så räknas poängen" |
| **Total** | | **27/36** | Good |

## Design Specificity Verdict
Mostly authored: the line network carries hero, score explainer, services and report. Slips: generic headline, split hero, middle sections (value, FAQ) drop the line world. Detector: 72 findings, 4 real (minor mobile facts padding), rest false positives (hidden tab panels, wrapper padding, deliberate dev-data stripe, body overflow clip). Browser: no console errors, no overflow, contrast passes, full keyboard focus visibility, reduced motion clean; small targets on branch links (26px).

## Priority Issues
- [P1] Headline cliché + split hero → specific headline naming offers; URL bar under headline per contract.
- [P1] Closing section competes; empty left panel → strengthen analysis panel, form up top.
- [P2] Orange reserved for analysis path everywhere.
- [P2] Dev-data tokens inline in sentences.
- [P2] Middle loses the line network (value section).
- Minor: branch link targets 26px, report board headings concatenate counts, "Bra redan nu" long list, repeated heavy per-category CTAs, mobile facts band tall.

## Persona Red Flags
First-time owner on mobile: facts band takes a screen; report ~11k px. Skeptical owner: proof thin (no cases exist, correctly not invented). Keyboard/SR: tabs correct; counts glued to headings.
