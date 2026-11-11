# Reviewer brief

Fill in the brackets. Give every reviewer the same brief, plus its role. Leave out your opinion of the change and how you reached it: a reviewer handed a conclusion tends to confirm it.

```
Repository: todoist/todoist-sdk-typescript, the official TypeScript SDK for the Todoist API
(TypeScript, Zod, Vitest with msw).
The change: `git diff <base>` in <checkout path>, plus the untracked files
`git ls-files --others --exclude-standard` lists there.

The task, in the owner's words:
<quote the request; add later clarifications verbatim>

Done means:
<the checkable behaviours, one per line>

Decisions already made:
<each decision and who made it>

Your role: <task review | blast-radius review | code review against .agents/checks/<check>.md>

Rules:
- The working tree at <checkout path> is read-only. Do not edit, stage, commit or run
  scripts there. To run or break code, make your own copy:
  `npm run review:worktree -- <your dir>`, then `npm ci` in it; remove it when done.
- Never call the real API (`npm run api:request`) unless the brief says the token in
  `.env` belongs to a test account.
- Rate each finding: cited (quote the lines), traced (followed the code path) or ran
  (a test or command showed it). Report only findings you can cite at least.
- For each: severity (P1 wrong or harmful, P2 misleading, P3 minor), file:line, the
  evidence, and the fix in one sentence. No praise, no summary of what is fine.
```

## Role notes

- **Task review:** missing pieces, unrequested changes, unhandled cases, tests that pass with the feature broken, a public API change missing from `README.md` or its JSDoc, a PR title whose type doesn't match the version bump the change needs, and in a refactor any changed test input or assertion. Read each new rule against every skill in `.agents/skills/`, every check in `.agents/checks/` and `AGENTS.md`, and report contradictions.
- **Blast-radius review:** name the one fact the change is safe because of, for the projects that depend on this package. Prove it by running code in your own worktree: `npm run build && npm pack`, install the tarball in one of them and run its checks, or call the real API on a test account for a schema change. Check a value export with a `node` import of the build, and a type-only export with a scratch `import type` file and `npx tsc --noEmit --strict`: `node` sees every type as `undefined`. Look past text search: what the API actually returns, which runtimes reach the code, what the version bump tells consumers.
- **Code review per check:** apply only that check's "Report" and "Fine" lists.
