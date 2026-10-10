# PROJECT_PLAN.md (Frontend)

Frontend for an internal leads dashboard ("lightweight Apollo"). See `TECH_STACK.md` for technology choices.

## 1. Goal

Give a 5-person team a fast, simple web interface to **search, filter, and browse** a very large global leads dataset (tens of millions of records). The UI never loads the full dataset; it pages through results delivered by an API.

## 2. Scope

**In scope (v1)**
- Login page (email + password) and protected routes
- Lead table with server-driven pagination, sorting, and virtualized rows
- Global search (name, company, title, email)
- Multi-filter sidebar (country, industry, job title, seniority, company size, and so on, depending on available columns)
- Active filter chips with "Clear all"
- Lead detail drawer or page
- Filters and search saved in the URL (shareable, bookmarkable)
- Column visibility toggle
- Loading, empty, and error states throughout
- Light and dark mode

**Out of scope (v1)**
- Email sending or sequences, CRM sync, enrichment
- Public signup, billing, multi-tenant features
- Mobile-first layouts
- Real-time updates

**Nice-to-have (v1.1+)**
- Saved filter presets and lists
- CSV export button for filtered results (with a row limit)
- Facet counts shown in the filter sidebar
- Keyboard shortcuts and a command palette
- Two-factor login screen (if the API supports it)

## 3. Frontend architecture overview

```
Browser (React + TypeScript SPA)
  |-- Routes: /login, /leads, /leads/:id
  |-- TanStack Query  <-- fetch -->  /api/* (external API contract)
  |-- URL query params = source of truth for filters, search, sort
  |-- TanStack Table + Virtual for rendering large result pages
        |
Static hosting: S3 + CloudFront
```

The frontend depends only on an agreed API contract (see `TECH_STACK.md`). It can be built and tested against a mocked API before the real one exists.

## 4. Phases

### Phase 0: Discovery and API contract (1-2 days)
- Confirm the list of columns, filterable fields, searchable fields, and sortable fields.
- Agree the API contract: endpoints, filter parameter format, cursor pagination, estimated totals, error shape, auth behavior.
- Produce quick wireframes for the table, filter sidebar, and detail view.
- **Exit:** signed-off contract (OpenAPI or Zod schemas) and wireframes.

### Phase 1: Project setup (1-2 days)
- Vite + React + TypeScript (strict), ESLint, Prettier, Husky, pnpm.
- Tailwind and shadcn/ui configured with theme tokens (light and dark).
- Typed API client, Zod schemas, TanStack Query provider.
- MSW mock server with realistic fake data (synthetic, never real leads).
- GitHub Actions CI: lint, typecheck, test, build.
- **Exit:** app shell runs locally against mocked API; CI is green.

### Phase 2: Authentication UI (1-2 days)
- Login page with React Hook Form + Zod.
- Session check on load, route guards, logout, and automatic redirect on 401.
- Friendly errors for wrong password and rate-limit responses.
- **Exit:** login flow works end to end against the mock and the real API.

### Phase 3: Leads table (3-5 days)
- Data table with TanStack Table (manual sorting and pagination) and TanStack Virtual.
- Cursor-based next/previous paging or infinite scroll.
- Column visibility, resizing, sticky header, and skeleton loading.
- Display of the estimated total with clear "approximate" labelling.
- **Exit:** smooth scrolling and paging on pages of 100+ rows.

### Phase 4: Search and filters (3-5 days)
- Search box with debounce and request cancellation.
- Filter sidebar with multi-select, range, and text controls.
- URL-synced filter state with Zod-validated parsing.
- Filter chips, "Clear all", and sensible defaults for invalid URLs.
- **Exit:** any filter combination is shareable by link and survives page reloads.

### Phase 5: Lead detail and polish (2-3 days)
- Detail drawer or page with all lead fields and copy-to-clipboard actions.
- Empty states, error boundaries, toasts, keyboard navigation, and focus management.
- Accessibility pass (axe checks, contrast, labels).
- **Exit:** the team can complete the full search-to-detail journey without help.

### Phase 6: Testing and delivery (2-3 days)
- Component tests (Vitest + Testing Library) for table, filters, and login.
- Playwright smoke tests: login, search, filter, paginate, open detail.
- Bundle size review and route-level code splitting.
- Production build deployed to S3 + CloudFront, with SPA fallback, caching rules, and security headers.
- Short README covering local setup, mock mode, and deployment.
- **Exit:** production URL live and smoke tests passing.

**Rough total:** 2.5-4 weeks for one frontend developer.

## 5. Key risks and mitigations

| Risk | Mitigation |
|---|---|
| UI becomes slow with large result pages | Virtualized rows, page size cap, memoized cells, performance checks in Phase 3 |
| API contract changes late | Lock the contract in Phase 0, use Zod validation at the boundary, keep the mock in sync |
| Total counts are not exact | Design the UI around estimated or capped totals from day one |
| Deep paging confuses users | Prefer search and filters over page jumping; cursor-based next/previous only |
| Filter state bugs and broken shared links | Single URL-sync hook, Zod-parsed params, unit tests for parsing |
| Personal data leaking via the UI | No real data in tests or stories, no console logging of records, no tokens in browser storage |
| Scope creep toward a full CRM | Hold to the v1 scope list; log extras for v1.1 |

## 6. Success criteria

- Table interactions feel instant; results appear in about 1 second for common searches (given a responsive API).
- Any filtered view can be shared as a URL and reproduces the same results.
- All 5 users can log in and find leads without training.
- Initial JS bundle under about 250 KB gzipped.
- A new developer can run the app against the mock API from the README in under 30 minutes.

## 7. Open questions

1. Which columns exist, and which should be filters, search fields, sortable columns, and default visible columns?
2. Is a CSV export button needed, and with what row limits?
3. Should the UI show facet counts in the filter sidebar, or are plain filters enough?
4. Does the login need a two-factor step in v1?
5. Is dark mode required in v1?
6. Who owns the API contract, and when will a real API be available for integration?
