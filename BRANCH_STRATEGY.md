# Git Branch Strategy - Tadfuq Platform

## 🌳 Branch Structure

```
main (production)
  ↑
  └── development (staging)
        ↑
        ├── feature/new-ingestion-architecture
        ├── feature/treasury-pipeline-worker
        ├── feature/event-driven-system
        ├── bugfix/transaction-deduplication
        └── hotfix/critical-security-patch
```

## 📋 Branch Types

### 1. `main` - Production Branch
- **Purpose:** Production-ready code
- **Protection:** 
  - ✅ Requires PR approval (2+ reviewers)
  - ✅ All CI checks must pass
  - ✅ No direct commits
  - ✅ Signed commits required
- **Deployment:** Auto-deploy to production
- **Merge From:** `development` only

### 2. `development` - Staging Branch
- **Purpose:** Integration and testing
- **Protection:**
  - ✅ Requires PR approval (1+ reviewer)
  - ✅ All tests must pass
  - ✅ No direct commits
- **Deployment:** Auto-deploy to staging
- **Merge From:** Feature/bugfix branches
- **Merge To:** `main` (after QA approval)

### 3. `feature/*` - Feature Branches
- **Naming:** `feature/short-description`
- **Examples:**
  - `feature/new-ingestion-architecture`
  - `feature/treasury-pipeline-worker`
  - `feature/nats-event-system`
- **Lifecycle:**
  1. Branch from `development`
  2. Develop and test locally
  3. Push and create PR to `development`
  4. Code review
  5. Merge and delete

### 4. `bugfix/*` - Bug Fix Branches
- **Naming:** `bugfix/issue-number-description`
- **Examples:**
  - `bugfix/123-transaction-deduplication`
  - `bugfix/456-csv-parser-date-format`
- **Lifecycle:** Same as feature branches

### 5. `hotfix/*` - Critical Production Fixes
- **Naming:** `hotfix/issue-number-description`
- **Examples:**
  - `hotfix/789-security-vulnerability`
  - `hotfix/101-data-corruption`
- **Special Process:**
  1. Branch from `main`
  2. Fix and test
  3. PR to `main` (expedited review)
  4. After merge to `main`, also merge to `development`

### 6. `release/*` - Release Preparation
- **Naming:** `release/v2.0.0`
- **Purpose:** Prepare for production release
- **Process:**
  1. Branch from `development`
  2. Version bump, changelog, final testing
  3. PR to `main`
  4. Tag release after merge

## 🔄 Workflow

### New Feature Development

```bash
# 1. Update development
git checkout development
git pull origin development

# 2. Create feature branch
git checkout -b feature/new-ingestion-architecture

# 3. Develop and commit
git add .
git commit -m "feat: implement CSV parser with new architecture"

# 4. Push and create PR
git push origin feature/new-ingestion-architecture
# Create PR on GitHub: feature/new-ingestion-architecture → development

# 5. After merge, delete branch
git branch -d feature/new-ingestion-architecture
git push origin --delete feature/new-ingestion-architecture
```

### Bug Fix

```bash
# 1. Create bugfix branch
git checkout development
git checkout -b bugfix/123-transaction-deduplication

# 2. Fix and test
git add .
git commit -m "fix: correct transaction hash generation for deduplication"

# 3. Push and create PR
git push origin bugfix/123-transaction-deduplication
# Create PR: bugfix/123-transaction-deduplication → development
```

### Hotfix (Production)

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/789-security-vulnerability

# 2. Fix critical issue
git add .
git commit -m "hotfix: patch SQL injection vulnerability"

# 3. PR to main (expedited)
git push origin hotfix/789-security-vulnerability
# Create PR: hotfix/789-security-vulnerability → main

# 4. After merge to main, also merge to development
git checkout development
git merge main
git push origin development
```

### Release Process

```bash
# 1. Create release branch from development
git checkout development
git pull origin development
git checkout -b release/v2.0.0

# 2. Update version and changelog
# Edit version files, CHANGELOG.md

git add .
git commit -m "chore: prepare v2.0.0 release"

# 3. Final testing on release branch

# 4. PR to main
git push origin release/v2.0.0
# Create PR: release/v2.0.0 → main

# 5. After merge, tag the release
git checkout main
git pull origin main
git tag -a v2.0.0 -m "Release v2.0.0 - New Architecture"
git push origin v2.0.0

# 6. Merge back to development
git checkout development
git merge main
git push origin development

# 7. Delete release branch
git branch -d release/v2.0.0
git push origin --delete release/v2.0.0
```

## 📝 Commit Message Convention

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples
```bash
feat(ingestion): add CSV parser with automatic type detection

Implemented new CSV parser that automatically detects bank statement
vs ledger format and parses accordingly.

Closes #123

---

fix(pipeline): correct vendor stats calculation

Fixed issue where vendor stats were not updating correctly due to
incorrect transaction filtering.

Fixes #456

---

docs(architecture): update workflow documentation

Added detailed diagrams and explanations for the new event-driven
architecture.

---

refactor(normalizer): extract vendor resolution to separate service

Moved vendor resolution logic from normalizer to dedicated service
for better separation of concerns.
```

## 🔒 Branch Protection Rules

### `main` Branch
```yaml
Protection Rules:
  - Require pull request reviews: 2
  - Dismiss stale reviews: true
  - Require review from code owners: true
  - Require status checks to pass: true
    - CI/CD pipeline
    - Unit tests
    - Integration tests
    - Security scan
  - Require branches to be up to date: true
  - Require signed commits: true
  - Include administrators: true
  - Restrict pushes: true
  - Allow force pushes: false
  - Allow deletions: false
```

### `development` Branch
```yaml
Protection Rules:
  - Require pull request reviews: 1
  - Require status checks to pass: true
    - CI/CD pipeline
    - Unit tests
    - Integration tests
  - Require branches to be up to date: true
  - Allow force pushes: false
  - Allow deletions: false
```

## 🚀 Deployment Strategy

### Development → Staging (Automatic)
```yaml
Trigger: Push to development
Steps:
  1. Run tests
  2. Build Docker images
  3. Deploy to staging environment
  4. Run smoke tests
  5. Notify team on Slack
```

### Development → Production (Manual)
```yaml
Trigger: PR merged to main
Steps:
  1. Run full test suite
  2. Build production images
  3. Deploy to production (blue-green)
  4. Run health checks
  5. Switch traffic
  6. Monitor metrics
  7. Notify team
```

## 📊 Current Architecture Migration

### Phase 1: New Architecture Development (✅ Complete)
```
development
  └── feature/new-ingestion-architecture (MERGED)
  └── feature/treasury-pipeline-worker (MERGED)
  └── feature/event-driven-system (MERGED)
```

### Phase 2: Testing & Integration (🔄 Current)
```
development (current state)
  - New architecture integrated
  - All tests passing
  - Ready for staging deployment
```

### Phase 3: Staged Rollout (⏳ Next)
```
main
  ← development (after QA approval)
  - Deploy with feature flags
  - 10% → 50% → 100% rollout
```

## 🔍 Code Review Guidelines

### Before Creating PR
- [ ] All tests pass locally
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No debug code left
- [ ] Commits are clean and descriptive

### PR Description Must Include
- [ ] What changed and why
- [ ] Testing performed
- [ ] Screenshots (if UI change)
- [ ] Migration steps (if needed)
- [ ] Performance impact

### Reviewer Checklist
- [ ] Code logic is sound
- [ ] Tests are comprehensive
- [ ] No security issues
- [ ] Performance acceptable
- [ ] Documentation clear
- [ ] Error handling robust

## 🏷️ Tagging Strategy

### Version Format
`v<major>.<minor>.<patch>`

### Examples
- `v2.0.0` - Major release (new architecture)
- `v2.1.0` - Minor release (new features)
- `v2.1.1` - Patch release (bug fixes)

### When to Tag
- After merge to `main`
- After successful production deployment
- For all releases

## 📈 Metrics & Monitoring

### Branch Health Metrics
- Average PR review time
- Time from PR to merge
- Number of commits per PR
- Test coverage per branch
- Build success rate

### Quality Gates
- Code coverage > 80%
- No critical security issues
- All tests passing
- Documentation complete
- Performance benchmarks met

## 🆘 Emergency Procedures

### Rollback Production
```bash
# 1. Identify last good version
git tag --list

# 2. Create hotfix from that tag
git checkout v2.0.0
git checkout -b hotfix/rollback-to-v2.0.0

# 3. Deploy immediately
# Follow hotfix process
```

### Revert Problematic Merge
```bash
# On development or main
git revert -m 1 <merge-commit-hash>
git push origin <branch>
```

---

**Last Updated:** March 2026  
**Version:** 2.0  
**Status:** Active
