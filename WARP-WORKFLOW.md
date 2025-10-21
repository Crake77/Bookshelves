# Warp Session Workflow - Quick Start

## Every Time You Start a New Warp Session

### Step 1: Tell Warp to Get Ready
```
"Read WARP.md and AGENTS.md, then pull latest changes from GitHub"
```

**What this does:** Gets Warp up to speed on the project and downloads any changes Codex made.

---

## While Working

### Step 2: Just Work Normally
```
"Add a new feature to..."
"Fix the bug in..."
"Update the homepage to..."
```

**What this does:** Warp will write code, make changes, test, etc. You don't need to think about Git.

---

## When You're Done

### Step 3: Save Your Work
```
"Commit and push these changes to GitHub"
```

**What this does:** Saves your work and uploads it so Codex can see it.

---

## Common Scenarios

### If You're Not Sure What Changed
```
"Show me what files were modified"
```
Warp will run: `git status`

### If Codex Worked While You Were Away
```
"Pull latest changes from GitHub"
```
Warp will run: `git pull origin main`

### If You Want to See Recent Work
```
"Show me the recent commit history"
```
Warp will run: `git log --oneline -10`

---

## Git Terms - Plain English

| Command | What It Means |
|---------|---------------|
| `git pull` | Download changes from GitHub |
| `git status` | Show what files you changed |
| `git add` | Mark files to be saved |
| `git commit` | Save changes with a note |
| `git push` | Upload to GitHub |

---

## Typical Full Session Example

```
You: "Read WARP.md and AGENTS.md, then pull latest from GitHub"
Warp: [reads files, pulls changes] ✅ Ready to work!

You: "Add a dark mode toggle to the settings page"
Warp: [writes code, tests it] ✅ Dark mode added!

You: "Commit and push to GitHub"
Warp: [saves and uploads] ✅ Changes pushed to GitHub!
```

---

## Emergency: Something Went Wrong

### If Git Says There Are Conflicts
```
"Help me resolve the merge conflicts"
```

### If You Pushed the Wrong Thing
```
"Undo my last commit but keep the changes"
```

### If You're Confused
```
"Explain what's happening with Git right now"
```

---

## Pro Tip

You don't need to memorize Git commands! Just tell Warp what you want in plain English:
- "Save my work" = commit
- "Upload to GitHub" = push  
- "Get Codex's changes" = pull
- "Show me what changed" = status/diff

Warp will translate it to the right Git commands for you.
