# STARTUP_SESSION

Use this checklist at the beginning of every session (Codex, Warp, or other agents). It consolidates the required context fetch + handoff steps.

1. **Sync repo**
   - `git fetch && git pull`
   - Confirm you are on `main` and note any dirty files before continuing.
2. **Check environment**
   - Run `/status` (or `printenv` equivalent) to capture sandbox, approval policy, and network info.
3. **Read `SESSION_START.md`**
   - This file holds the evergreen guardrails (auth, safety, deploy rules).
4. **Read `NEXT_AGENT_INSTRUCTIONS.md`**
   - Captures the previous session’s summary, current priority, blockers, and immediate next steps.
5. **Consult `DOCUMENTATION_MASTER_INDEX.md`**
   - Skim for any docs referenced by the current priority (schema refs, taxonomy guides, runbooks). Open only what’s relevant.
6. **Confirm today’s plan**
   - Based on `NEXT_AGENT_INSTRUCTIONS.md`, restate the concrete steps you’ll take before coding (use the plan tool).
7. **Log unexpected issues immediately**
   - If repos are dirty, schema differs, or secrets are missing, pause and inform the user before proceeding.

### Session End Requirements
1. Finish the planned work or document blockers in `NEXT_AGENT_INSTRUCTIONS.md` (include token usage if applicable).
2. Update/merge any docs you created and ensure `DOCUMENTATION_MASTER_INDEX.md` stays accurate.
3. Decide whether files should move to `archives/` (use `archive-old-docs.js` if so) and note the move in the index.
4. Run relevant tests/linters.
5. `git status` → `git add` → `git commit -m "Session YYYY-MM-DD: <summary>"` → `git push`.
6. Provide a concise handoff summary referencing the files and instructions for the next agent.
