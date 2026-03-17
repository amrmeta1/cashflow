# Git Commands Reference - Development Workflow

## 🚀 Quick Start

### Initial Setup
```bash
# Clone repository
git clone https://github.com/tadfuq/platform.git
cd platform

# Checkout development branch
git checkout development
git pull origin development
```

## 📝 Daily Workflow

### Start New Feature
```bash
# Update development
git checkout development
git pull origin development

# Create feature branch
git checkout -b feature/your-feature-name

# Example:
git checkout -b feature/csv-parser-improvements
```

### Make Changes
```bash
# Check status
git status

# Add files
git add .
# Or specific files
git add backend/internal/ingestion/parsers/csv_parser.go

# Commit with message
git commit -m "feat(ingestion): improve CSV date parsing"

# Push to remote
git push origin feature/your-feature-name
```

### Update Your Branch
```bash
# Get latest from development
git checkout development
git pull origin development

# Switch back to your branch
git checkout feature/your-feature-name

# Merge development into your branch
git merge development

# Or rebase (cleaner history)
git rebase development

# Push updated branch
git push origin feature/your-feature-name --force-with-lease
```

## 🔄 Common Scenarios

### Scenario 1: Create PR
```bash
# 1. Make sure branch is up to date
git checkout feature/your-feature-name
git pull origin development
git merge development

# 2. Push final changes
git push origin feature/your-feature-name

# 3. Go to GitHub and create PR
# feature/your-feature-name → development
```

### Scenario 2: Fix Conflicts
```bash
# When merge has conflicts
git merge development

# Fix conflicts in files, then:
git add .
git commit -m "merge: resolve conflicts with development"
git push origin feature/your-feature-name
```

### Scenario 3: Amend Last Commit
```bash
# Made a mistake in last commit?
git add .
git commit --amend --no-edit

# Or change message
git commit --amend -m "feat(ingestion): correct commit message"

# Push (force required after amend)
git push origin feature/your-feature-name --force-with-lease
```

### Scenario 4: Undo Changes
```bash
# Undo uncommitted changes
git checkout -- filename.go

# Undo all uncommitted changes
git reset --hard

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

### Scenario 5: Stash Work
```bash
# Save work temporarily
git stash

# List stashes
git stash list

# Apply last stash
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Clear all stashes
git stash clear
```

## 🌿 Branch Management

### List Branches
```bash
# Local branches
git branch

# Remote branches
git branch -r

# All branches
git branch -a
```

### Switch Branches
```bash
# Switch to existing branch
git checkout development

# Create and switch to new branch
git checkout -b feature/new-feature
```

### Delete Branches
```bash
# Delete local branch
git branch -d feature/old-feature

# Force delete (if not merged)
git branch -D feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature
```

### Rename Branch
```bash
# Rename current branch
git branch -m new-branch-name

# Rename specific branch
git branch -m old-name new-name

# Update remote
git push origin :old-name new-name
git push origin -u new-name
```

## 📊 Viewing History

### View Commits
```bash
# Recent commits
git log

# One line per commit
git log --oneline

# Last 5 commits
git log -5

# With file changes
git log --stat

# Graphical view
git log --graph --oneline --all
```

### View Changes
```bash
# Uncommitted changes
git diff

# Changes in specific file
git diff filename.go

# Changes between branches
git diff development feature/your-feature

# Changes in last commit
git show HEAD
```

## 🔍 Search & Find

### Find Commits
```bash
# Search commit messages
git log --grep="parser"

# Find by author
git log --author="Your Name"

# Find by date
git log --since="2 weeks ago"
git log --until="2024-03-01"
```

### Find Code
```bash
# Search in files
git grep "function name"

# Search in specific file type
git grep "TODO" -- "*.go"
```

## 🛠️ Advanced Operations

### Cherry-Pick
```bash
# Apply specific commit to current branch
git cherry-pick <commit-hash>

# Cherry-pick multiple commits
git cherry-pick <hash1> <hash2>
```

### Rebase Interactive
```bash
# Rebase last 3 commits
git rebase -i HEAD~3

# In editor:
# pick = keep commit
# reword = change message
# squash = combine with previous
# drop = remove commit
```

### Clean Up
```bash
# Remove untracked files (dry run)
git clean -n

# Remove untracked files
git clean -f

# Remove untracked files and directories
git clean -fd
```

## 🔐 Tags

### Create Tags
```bash
# Lightweight tag
git tag v2.0.0

# Annotated tag (recommended)
git tag -a v2.0.0 -m "Release version 2.0.0"

# Tag specific commit
git tag -a v2.0.0 <commit-hash> -m "Release 2.0.0"
```

### Push Tags
```bash
# Push specific tag
git push origin v2.0.0

# Push all tags
git push origin --tags
```

### List & Delete Tags
```bash
# List tags
git tag

# Delete local tag
git tag -d v2.0.0

# Delete remote tag
git push origin --delete v2.0.0
```

## 🆘 Emergency Commands

### Recover Lost Commits
```bash
# Show reflog
git reflog

# Recover commit
git checkout <commit-hash>
git checkout -b recovery-branch
```

### Abort Operations
```bash
# Abort merge
git merge --abort

# Abort rebase
git rebase --abort

# Abort cherry-pick
git cherry-pick --abort
```

### Reset to Remote
```bash
# Discard all local changes and match remote
git fetch origin
git reset --hard origin/development
```

## 📋 Useful Aliases

Add to `~/.gitconfig`:

```ini
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = log --graph --oneline --all
    amend = commit --amend --no-edit
    undo = reset --soft HEAD~1
```

Usage:
```bash
git st          # instead of git status
git co main     # instead of git checkout main
git visual      # see branch graph
```

## 🎯 Best Practices

### Commit Messages
```bash
# Good
git commit -m "feat(parser): add support for QNB PDF format"
git commit -m "fix(pipeline): correct vendor stats calculation"
git commit -m "docs: update architecture diagrams"

# Bad
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "asdf"
```

### Before Pushing
```bash
# Always check what you're pushing
git status
git diff origin/development

# Run tests
go test ./...

# Lint code
golangci-lint run
```

### Daily Routine
```bash
# Morning: Update your branch
git checkout development
git pull origin development
git checkout feature/your-feature
git merge development

# Evening: Push your work
git add .
git commit -m "feat: descriptive message"
git push origin feature/your-feature
```

## 🔗 Quick Reference

| Command | Description |
|---------|-------------|
| `git status` | Show working tree status |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Commit with message |
| `git push` | Push to remote |
| `git pull` | Fetch and merge |
| `git checkout -b name` | Create new branch |
| `git merge branch` | Merge branch |
| `git log` | View commit history |
| `git diff` | Show changes |
| `git stash` | Save work temporarily |

---

**Pro Tip:** Use `git help <command>` for detailed help on any command.

Example: `git help rebase`
