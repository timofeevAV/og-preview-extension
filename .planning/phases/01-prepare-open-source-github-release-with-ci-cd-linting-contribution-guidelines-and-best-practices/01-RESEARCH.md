# Phase 1: Prepare Open-Source GitHub Release with CI/CD, Linting, Contribution Guidelines, and Best Practices - Research

**Researched:** 2026-02-21
**Domain:** Open-source project setup, GitHub Actions CI/CD, community standards
**Confidence:** HIGH

## Summary

This phase transforms a mature, working browser extension (v1.0 shipped, all 9 phases complete) into a well-structured open-source GitHub repository. The project already has a solid foundation: ESLint (flat config, strictTypeChecked), Prettier with Tailwind plugin, simple-git-hooks + lint-staged pre-commit hooks, VS Code settings, and passing typecheck/lint/format/test commands. The work is primarily about adding missing community files, creating a CI/CD pipeline, configuring the GitHub repository with `gh` CLI, and filling small gaps in the existing tooling setup.

The codebase is clean: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm test` all pass with zero errors. There are 17 Vitest tests in 1 test file. The linting stack (ESLint 10 + typescript-eslint strictTypeChecked + react-hooks + perfectionist import sorting) is already best-in-class. The key additions are: GitHub Actions CI workflow, community files (LICENSE, CONTRIBUTING.md, issue/PR templates, CODE_OF_CONDUCT, SECURITY.md), `.editorconfig`, `packageManager` field in package.json, and repository configuration via `gh` CLI.

**Primary recommendation:** Build a single GitHub Actions CI workflow that runs lint, format check, typecheck, test, and build on every push/PR, then add community files and configure the GitHub repository programmatically.

## Standard Stack

### Core (Already Installed)

| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| ESLint | ^10.0.0 | Linting (flat config) | Configured, passing |
| typescript-eslint | ^8.56.0 | TypeScript-aware rules (strictTypeChecked) | Configured, passing |
| eslint-plugin-react-hooks | ^7.0.1 | React hooks rules | Configured |
| eslint-plugin-perfectionist | ^5.6.0 | Import sorting | Configured |
| Prettier | ^3.8.1 | Code formatting | Configured, passing |
| prettier-plugin-tailwindcss | ^0.7.2 | Tailwind class sorting | Configured |
| simple-git-hooks | ^2.13.1 | Git hooks (pre-commit) | Installed, working |
| lint-staged | ^16.2.7 | Run linters on staged files | Configured |
| Vitest | ^4.0.18 | Unit testing | 17 tests passing |
| TypeScript | ^5.9.3 | Type checking (strict + noUncheckedIndexedAccess) | Configured, passing |

### Supporting (To Be Added - No Installation Required)

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| GitHub Actions | N/A | CI/CD pipeline | On every push/PR |
| `actions/checkout` | v4 | Checkout code | Every workflow |
| `pnpm/action-setup` | v4 | Install pnpm | Every workflow |
| `actions/setup-node` | v4 | Install Node.js with caching | Every workflow |
| `actions/upload-artifact` | v4 | Upload build zip | On main branch builds |
| `gh` CLI | (local) | Configure repository | One-time setup |

**Note on action versions:** While `actions/checkout@v6` and `actions/setup-node@v6` exist, `v4` is the widely-used stable version that most projects reference. Using v4 is safe and well-documented. The project can upgrade later if needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| simple-git-hooks | Husky | Husky has 64x more weekly downloads but requires `prepare` script; simple-git-hooks already works here, zero reason to switch |
| simple-git-hooks | Lefthook | Faster for polyglot/large repos; overkill for this project |
| ESLint + Prettier | Biome | Biome is faster but lacks react-hooks and perfectionist plugins; existing config is already tuned |
| Separate lint/format | eslint-plugin-prettier | Mixing concerns; the current separate-tool approach is the modern standard |

**Installation:** No new packages required. All tooling is already installed.

## Architecture Patterns

### Recommended .github Directory Structure

```
.github/
  ISSUE_TEMPLATE/
    bug_report.yml        # YAML issue form (structured fields)
    feature_request.yml   # YAML issue form
    config.yml            # Template chooser config
  PULL_REQUEST_TEMPLATE.md
  workflows/
    ci.yml                # Main CI workflow
```

### Recommended Root Files to Add

```
(project root)
  .editorconfig           # Cross-editor formatting baseline
  .node-version           # Pin Node.js version for contributors
  LICENSE                 # MIT license
  CONTRIBUTING.md         # How to contribute
  CODE_OF_CONDUCT.md      # Contributor Covenant
  SECURITY.md             # Security vulnerability reporting
```

### Pattern 1: Single CI Workflow with Concurrency Control

**What:** One `ci.yml` workflow that runs all quality checks in parallel jobs, with smart concurrency to cancel stale runs on PRs.

**When to use:** Every push to main and every PR.

**Example:**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.sha }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```
**Source:** GitHub Actions docs, pnpm CI docs, WXT publishing guide

**Design decisions:**
- All checks in a single job (not parallel jobs): This project is small (~2,500 LOC), so the overhead of spinning up multiple runners outweighs any parallelism benefit. A single job with sequential steps is simpler and cheaper.
- `--frozen-lockfile`: pnpm 10 automatically adds this on CI, but being explicit is clearer.
- `.node-version` file: Ensures contributors and CI use the same Node.js version.
- `pnpm/action-setup@v4`: Reads pnpm version from `packageManager` field in package.json when no version is specified.
- Build step included: Verifies the extension actually compiles.
- Upload artifact step (for main only): Makes the built extension zip downloadable from the Actions tab.

### Pattern 2: YAML Issue Forms (Not Markdown Templates)

**What:** Use `.yml` issue forms instead of `.md` templates for structured bug reports and feature requests.

**When to use:** All new issues.

**Why:** YAML forms produce structured, consistent issues with required fields, dropdowns, and validation. Markdown templates are freeform and often ignored.

**Source:** [GitHub Docs - Syntax for issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)

### Pattern 3: Repository Configuration via gh CLI

**What:** Use `gh` CLI commands to set repository metadata, labels, and settings programmatically.

**Example commands:**
```bash
# Set repository description and topics
gh repo edit --description "Chrome extension to preview Open Graph cards for any webpage or link" \
  --add-topic browser-extension \
  --add-topic chrome-extension \
  --add-topic open-graph \
  --add-topic og-tags \
  --add-topic social-media-preview \
  --add-topic wxt \
  --add-topic react \
  --add-topic typescript \
  --enable-discussions=false \
  --enable-wiki=false \
  --delete-branch-on-merge

# Create issue labels
gh label create "bug" -d "Something isn't working" -c "d73a4a" -f
gh label create "enhancement" -d "New feature or request" -c "a2eeef" -f
gh label create "good first issue" -d "Good for newcomers" -c "7057ff" -f
gh label create "documentation" -d "Improvements or additions to documentation" -c "0075ca" -f
gh label create "ci" -d "CI/CD and automation" -c "e4e669" -f
gh label create "dependencies" -d "Pull requests that update a dependency" -c "0366d6" -f
```

**Note on branch protection:** Branch protection rules require the repository to be public (or on a paid plan) and need admin access. The CI workflow status checks must exist (have run at least once) before they can be required. This should be configured manually after the first CI run, or scripted via `gh api`.

### Anti-Patterns to Avoid

- **Over-engineering CI:** Do not create matrix builds for multiple Node versions or browsers for this project. It ships a single Chrome MV3 extension. One Node version, one build target.
- **Separate workflows per check:** Do not create `lint.yml`, `test.yml`, `build.yml` separately. For a small project, this creates unnecessary complexity and slows feedback (each workflow has its own setup overhead).
- **Using `actions/cache` directly:** The `setup-node` action handles caching when `cache: 'pnpm'` is specified. Manual cache configuration is unnecessary overhead.
- **Markdown issue templates:** YAML issue forms are strictly better (structured fields, validation, dropdowns). Markdown templates should not be used.
- **Running `pnpm install` without `--frozen-lockfile` in CI:** This could silently update the lockfile and produce inconsistent builds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git hooks | Custom `.git/hooks/` scripts | simple-git-hooks (already configured) | Cross-platform, version-controlled, auto-installed |
| Dependency caching in CI | Manual `actions/cache` with custom keys | `setup-node` `cache: 'pnpm'` built-in | Handles cache key generation, restore, and save automatically |
| Issue forms | Markdown templates | YAML issue forms (.yml) | Structured fields, validation, required inputs |
| License text | Writing license manually | Copy MIT license from choosealicense.com | Legal accuracy matters |
| Code of Conduct | Custom behavior guidelines | Contributor Covenant v2.1 | Industry standard, recognized by GitHub |

**Key insight:** This phase is about assembling well-known components correctly, not inventing anything new. Every piece (CI workflow, issue templates, license, CoC) has an established standard pattern.

## Common Pitfalls

### Pitfall 1: Missing packageManager Field

**What goes wrong:** `pnpm/action-setup` in CI can't detect the correct pnpm version and uses a default, potentially causing lockfile incompatibilities.
**Why it happens:** The `packageManager` field in package.json was never added because the project was developed locally only.
**How to avoid:** Add `"packageManager": "pnpm@10.26.1"` to package.json (matching the local version). This also enables corepack support.
**Warning signs:** CI installs a different pnpm version than local, lockfile changes in CI.

### Pitfall 2: Node Version Mismatch

**What goes wrong:** CI uses a different Node.js version than local development, causing subtle differences in behavior or build output.
**Why it happens:** No `.node-version` file exists; `setup-node` defaults to whatever is latest.
**How to avoid:** Create `.node-version` file with `22` (Node.js 22 LTS, maintained until April 2027). The project currently runs on Node 25 locally, but CI should target the LTS version for stability. Node 22 is sufficient for all dependencies.
**Warning signs:** Works locally but fails in CI, or vice versa.

### Pitfall 3: Concurrency Group Without Event Discrimination

**What goes wrong:** Pushes to main cancel each other, losing CI results.
**Why it happens:** Using a simple concurrency group like `${{ github.workflow }}` cancels ALL runs, including push-to-main runs that should complete.
**How to avoid:** Use `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` so only PR runs are cancelled (new push to same PR supersedes old), while push-to-main runs always complete.
**Warning signs:** Intermittently missing CI results on the main branch.

### Pitfall 4: Pre-commit Hooks Not Installed After Clone

**What goes wrong:** Contributors clone the repo, run `pnpm install`, but pre-commit hooks aren't active because `simple-git-hooks` wasn't allowed to run its postinstall script.
**Why it happens:** pnpm 10+ blocks postinstall scripts by default. The `onlyBuiltDependencies` config in package.json must include `simple-git-hooks`.
**How to avoid:** This is already handled. The project has `"onlyBuiltDependencies": ["esbuild", "spawn-sync", "simple-git-hooks"]` in the `pnpm` config section of package.json.
**Warning signs:** `cat .git/hooks/pre-commit` shows no custom hook content.

### Pitfall 5: Branch Protection Before First CI Run

**What goes wrong:** Trying to require status checks that don't exist yet results in an error or the checks never being enforced.
**Why it happens:** GitHub requires status check names to have been seen at least once before they can be made required.
**How to avoid:** Set up branch protection after the first successful CI run. Document this as a manual step or use a separate setup script.
**Warning signs:** Branch protection created but no required checks listed.

### Pitfall 6: Gitignore Missing .planning and CLAUDE.md

**What goes wrong:** Internal planning files and Claude Code instructions get committed to the public repository.
**Why it happens:** These files are useful during development but inappropriate for a public repo.
**How to avoid:** Add `.planning/` and `CLAUDE.md` to `.gitignore` before making the repo public. However, note that CLAUDE.md might actually be useful for other Claude Code users working on the project -- this is a user decision.
**Warning signs:** Planning artifacts visible in public repository.

## Code Examples

### GitHub Actions CI Workflow (ci.yml)

```yaml
# Source: Assembled from GitHub Actions docs, pnpm CI guide, WXT publishing guide
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.sha }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  ci:
    name: Lint, Test & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Check formatting
        run: pnpm format:check

      - name: Type check
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Upload extension artifact
        if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: og-preview-chrome-mv3
          path: .output/chrome-mv3/
          retention-days: 30
```

### .editorconfig

```ini
# Source: EditorConfig.org + TypeScript/React project conventions
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### Bug Report Issue Form (bug_report.yml)

```yaml
# Source: GitHub Docs - Syntax for issue forms
name: Bug Report
description: Report a bug or unexpected behavior
labels: ["bug"]
body:
  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear description of what the bug is
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: Steps to reproduce the behavior
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What you expected to happen
    validations:
      required: true
  - type: input
    id: browser
    attributes:
      label: Browser
      description: Which browser are you using?
      placeholder: "Chrome 131, Edge 131, Brave 1.73"
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Extension version
      description: Which version of the extension?
      placeholder: "0.1.0"
    validations:
      required: true
  - type: textarea
    id: additional
    attributes:
      label: Additional context
      description: Add any other context, screenshots, or screen recordings
```

### Feature Request Issue Form (feature_request.yml)

```yaml
name: Feature Request
description: Suggest an idea or improvement
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What problem does this solve? What's the use case?
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: Describe the solution you'd like
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
      description: Any alternative solutions or features you've considered?
  - type: textarea
    id: additional
    attributes:
      label: Additional context
      description: Add any other context or screenshots
```

### Pull Request Template (PULL_REQUEST_TEMPLATE.md)

```markdown
## Summary

<!-- Brief description of changes -->

## Changes

-

## Testing

- [ ] `pnpm lint` passes
- [ ] `pnpm format:check` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` completes successfully
- [ ] Tested manually in Chrome/Edge/Brave

## Related Issues

<!-- Closes #123 -->
```

### packageManager field addition

```json
{
  "packageManager": "pnpm@10.26.1"
}
```

### .node-version

```
22
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Markdown issue templates (.md) | YAML issue forms (.yml) | GitHub 2021, now standard | Structured inputs, validation, required fields |
| Husky (prepare script) | simple-git-hooks / Husky v9 | 2023-2024 | Zero-config git hooks; project already uses simple-git-hooks |
| `actions/setup-node@v3` | `actions/setup-node@v4` (v6 available) | 2023-2026 | Better caching, Node 22/24 support |
| ESLint legacy config (.eslintrc) | ESLint flat config (eslint.config.js) | ESLint v9 (2024) | Project already uses flat config |
| `pnpm install` in CI | `pnpm install --frozen-lockfile` | pnpm 6+ | Deterministic installs, fails on lockfile mismatch |
| Manual pnpm version in CI | `packageManager` field + pnpm/action-setup auto-detect | pnpm 7+, corepack | Consistent versions across local and CI |

**Deprecated/outdated:**
- Markdown issue templates: YAML forms are the modern replacement
- `.eslintrc.*` config files: Flat config (`eslint.config.js`) is the standard since ESLint v9
- `actions/setup-node@v3`: v4+ supports pnpm caching natively

## Open Questions

1. **Should CLAUDE.md be committed to the public repo?**
   - What we know: CLAUDE.md contains project guidelines for Claude Code users. It's useful for AI-assisted development but may seem unusual in a public repo.
   - What's unclear: Whether the user wants this visible to the public or only for personal use.
   - Recommendation: Ask the user. If yes, keep it. If no, add to `.gitignore`.

2. **Should .planning/ directory be included in the public repo?**
   - What we know: Contains detailed planning artifacts, state, and research from the v1.0 build. Very detailed internal process documentation.
   - What's unclear: Whether the user considers this part of the public project.
   - Recommendation: Likely exclude via `.gitignore` -- these are internal planning artifacts, not project documentation.

3. **MIT vs Apache 2.0 license?**
   - What we know: Both are excellent for open-source browser extensions. MIT is simpler and more widely used. Apache 2.0 offers patent protection.
   - What's unclear: User preference.
   - Recommendation: Default to MIT (most common for browser extensions and small projects). Flag for user decision.

4. **Should the default branch be renamed from `master` to `main`?**
   - What we know: The current branch is `master`. `main` is the modern GitHub default and convention.
   - What's unclear: User preference and whether there are any downstream references to `master`.
   - Recommendation: Rename to `main` as part of this phase. GitHub's standard is `main` and the CI workflow references `main`.

5. **Dependabot or Renovate for dependency updates?**
   - What we know: Automated dependency updates are a best practice for open-source projects. Dependabot is built into GitHub. Renovate offers more configuration.
   - What's unclear: Whether this is in scope for this phase or a future concern.
   - Recommendation: Add basic Dependabot config (`.github/dependabot.yml`) for automated security updates. It's 10 lines of YAML and has clear value.

## Sources

### Primary (HIGH confidence)
- GitHub Actions documentation (actions/checkout, actions/setup-node, pnpm/action-setup) - workflow setup, caching
- GitHub Docs - Issue forms syntax, PR templates, CONTRIBUTING.md, SECURITY.md
- pnpm CI documentation (https://pnpm.io/continuous-integration) - frozen-lockfile, caching
- WXT publishing guide (https://wxt.dev/guide/essentials/publishing.html) - build/zip/submit patterns
- EditorConfig.org - configuration format
- choosealicense.com - license selection
- Project codebase analysis - existing ESLint, Prettier, simple-git-hooks, lint-staged configuration verified working

### Secondary (MEDIUM confidence)
- GitHub community discussions on open-source best practices
- WXT examples repository (wxt-dev/wxt-examples) - real-world patterns
- aklinker1/github-better-line-counts - WXT extension with CI/CD as reference

### Tertiary (LOW confidence)
- None. All findings verified with official sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already installed and verified working; CI patterns well-documented
- Architecture: HIGH - GitHub Actions + community files are established patterns with clear official documentation
- Pitfalls: HIGH - All pitfalls verified against current project state and official documentation

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain, tools change slowly)
