# Phase 2 placeholders

Shell-only / upcoming modules. **Do not treat these as production feature patterns.**

| Page | Intent |
|------|--------|
| `CustomerPage.jsx` | Branch CRM / customer management (not wired to BM nav yet) |
| `BranchReportsPage.jsx` | Branch reports (phase 2) |

When a module ships for real:

1. Move the page into `pages/branch/` (or the correct role folder).
2. Add `components/feature/...` + `hooks/branch/...`.
3. Wire routes in `router/index.jsx` + `PATHS`.
4. Delete or empty this folder when nothing remains.
