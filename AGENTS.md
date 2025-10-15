# Bookshelves – Codex Playbook

## Goal
Build and deploy Bookshelves with Vercel in a fully automated flow. Do not ask for approvals unless a command fails.

## Auth & Env
- Use the saved Vercel CLI login from this machine. If commands return “login required”, prompt me to run `vercel login` in the Ubuntu shell and retry.
- Do **not** write or prompt for tokens. No secrets in files.

## Preview Deploy (default task)
Run these commands in this repo, non-interactively:
1. `vercel pull --environment=preview --yes`
2. `vercel build`
3. `vercel deploy --prebuilt`
Report:
- Preview URL
- Inspect URL
If any command fails, stop, show the exact stderr, and suggest the single next command to run.

## Production Deploy (on request)
When I say “promote” or “deploy to prod”, run:
- `vercel --prod`
Then report the Production URL and Inspect URL.

## GitHub
When I say “commit” or “push”, stage changes, commit with a concise message, and push to `main`. If there are merge conflicts or auth issues, stop and show me the exact error.

## Safety & Scope
- Work only inside the current workspace.
- Assume network is allowed.
- Do not modify unrelated files.
