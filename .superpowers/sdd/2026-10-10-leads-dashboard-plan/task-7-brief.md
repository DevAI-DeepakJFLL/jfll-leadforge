# Task 7 Brief: Quality Passes, Verification & Polish

## Goal
Perform comprehensive quality passes, automated tests, visual verification against `Ref.jpg`, documentation updates, and final production build verification:
1. Automated unit & component tests using Vitest (verifying search, filtering, table selection, and export).
2. Quality passes covering:
   - Code Review (strict TypeScript, component modularity, clean architecture).
   - Security Audit (zero tokens in client storage, sanitized DOM, safe URL parameter parsing).
   - UI/UX Pro Max (side-by-side comparison with `Ref.jpg`, hover/active transitions, responsive layout).
   - Impeccable Content (microcopy, tooltips, clear empty states, accessible button labels).
3. Record visual comparison log in `docs/REVIEW_LOG.md`.
4. Update `README.md` with instructions for local development, mock mode, and production build.
5. Verify production build passes cleanly.

## Deliverables
- `tests/leads.test.ts` or `src/test/leads.test.tsx`: Vitest tests testing filtering, search, lead selection, and CSV export.
- `docs/REVIEW_LOG.md`: Detailed comparison log against `Ref.jpg` covering layout, navigation, filters, table, action bar, typography, and states.
- `README.md`: Setup, dev commands, build, test, and architecture documentation.
- Run `npm test` and `npm run build` with 100% pass rate.
- Commit changes: `feat: add automated tests, review log and documentation`.
- Report written to `.superpowers/sdd/2026-10-10-leads-dashboard-plan/task-7-report.md`.
