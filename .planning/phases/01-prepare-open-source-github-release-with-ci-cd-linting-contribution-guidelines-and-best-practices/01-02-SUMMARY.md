---
plan: 01-02
phase: 01-prepare-open-source-github-release-with-ci-cd-linting-contribution-guidelines-and-best-practices
status: complete
started: 2026-02-21
completed: 2026-02-21
duration: ~3 min
---

## Summary

Created all community health files and GitHub templates for open-source release.

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | Create LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md | ✓ |
| 2 | Create GitHub issue templates (YAML forms) and PR template | ✓ |

## Key Files

### Created
- `LICENSE` — MIT license (2026, OG Preview Extension contributors)
- `CONTRIBUTING.md` — Setup guide, available scripts, project structure, PR guidelines
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `SECURITY.md` — Private vulnerability reporting via GitHub Security Advisories
- `.github/ISSUE_TEMPLATE/bug_report.yml` — YAML issue form with required fields
- `.github/ISSUE_TEMPLATE/feature_request.yml` — YAML issue form with required fields
- `.github/ISSUE_TEMPLATE/config.yml` — Template chooser (blank issues enabled)
- `.github/PULL_REQUEST_TEMPLATE.md` — PR template with testing checklist

## Decisions

- [01-02]: Contributor Covenant v2.1 chosen as industry-standard CoC
- [01-02]: YAML issue forms (.yml) used over markdown templates (.md) for structured validation
- [01-02]: Generic copyright holder "OG Preview Extension contributors" to avoid personal name

## Deviations

None.

## Self-Check: PASSED

- [x] All 4 community health files exist at project root
- [x] LICENSE contains "MIT License"
- [x] CONTRIBUTING.md references pnpm install and pnpm dev
- [x] CODE_OF_CONDUCT.md contains "Contributor Covenant"
- [x] SECURITY.md mentions private vulnerability reporting
- [x] All GitHub templates exist in .github/
- [x] Bug report form has required field validations
- [x] Feature request form has required field validations
- [x] PR template has testing checklist with all quality commands
