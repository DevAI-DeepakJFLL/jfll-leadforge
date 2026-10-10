# TECH_STACK.md (Frontend)

Frontend for an internal leads dashboard ("lightweight Apollo") used by a 5-person team to search, filter, sort, and browse a very large leads dataset (tens of millions of rows) served through an API.

## Requirements this stack is built around

| Requirement | Value |
|---|---|
| Users | 5 internal users, email + password login |
| Core features | Search, filter, sort, browse, view lead details |
| Data scale | Tens of millions of records, never loaded at once |
| Priorities | Reliable, easy to maintain, low cost, fast to use |

## TL;DR

| Concern | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Framework | React 18+ |
| Build tool | Vite (SPA) |
| Routing | TanStack Router (or React Router) |
| Server state | TanStack Query |
| Data grid | TanStack Table + TanStack Virtual |
| Styling | Tailwind CSS |
| Components | shadcn/ui (Radix UI primitives) |
| Icons | lucide-react |
| Forms | React Hook Form + Zod |
| Validation / types | Zod |
| UI state | URL query params first, Zustand only if needed |
| Testing | Vitest, React Testing Library, Playwright, MSW |
| Code quality | ESLint, Prettier, TypeScript strict, Husky + lint-staged |
| Static hosting | S3 + CloudFront |
| CI/CD | GitHub Actions |

## Decision: React + TypeScript (Vite) vs Next.js

**Recommendation: Vite + React + TypeScript.**

- This is an internal, login-gated tool. There are no public pages and no SEO needs, so server-side rendering adds nothing.
- A Vite build outputs plain static files. They can be hosted on any static host for very little money, with no frontend server to run or patch.
- Fewer moving parts means easier maintenance for a small team.
- Choose Next.js only if you later need public pages or server components in the same codebase. That is not a current requirement.

## Core libraries

### Framework and language
- **React + TypeScript** with `strict: true`. Avoid `any`; if unavoidable, add a comment explaining why.
- **Vite** for fast dev server, HMR, and optimized production builds.

### Routing
- **TanStack Router** (type-safe routes and search params) or **React Router**. Either is fine; pick one and keep it consistent.
- Routes: `/login`, `/leads` (table + filters), `/leads/:id` (detail), `/settings` (optional).
- Protected routes redirect unauthenticated users to `/login`.

### Server state and data fetching
- **TanStack Query** for fetching, caching, retries, and request cancellation.
- Use `keepPreviousData` (placeholder data) so the table does not flicker between pages.
- Debounce search input (about 300 ms) and cancel in-flight requests when filters change.
- Keep a thin typed API client module (`fetch` wrapper) that handles credentials, error mapping, and 401 redirects.

### Data table
- **TanStack Table** configured for **manual (server-side) sorting, filtering, and pagination**.
- **TanStack Virtual** to virtualize rows so only visible rows render.
- Cursor-based "next / previous" paging, or infinite scroll through `useInfiniteQuery`. Do not assume page numbers or total counts are available.
- Column visibility toggle, resizable columns, and sticky header.

### Filtering and search UI
- Global search box plus a filter sidebar (multi-select, range, text, and date controls as the columns require).
- **Filter state lives in the URL query string**, so views are shareable, bookmarkable, and work with the back button.
- Parse and validate URL params with Zod so bad URLs fall back to safe defaults.
- Show active filters as removable chips with a "Clear all" action.
- Optional later: saved filter presets.

### Styling and components
- **Tailwind CSS** for styling.
- **shadcn/ui** (built on Radix UI) for accessible components: dialog, drawer/sheet, dropdown, command palette, popover, tabs, toast, skeleton.
- **lucide-react** for icons.
- Support light and dark mode via CSS variables.

### Forms and validation
- **React Hook Form** with **Zod** resolvers for the login form and any future forms.
- **Zod** also validates API responses at the boundary and derives TypeScript types, so runtime data matches compile-time types.

### Client-side state
- Prefer, in order: URL params, TanStack Query cache, local component state.
- Add **Zustand** only if truly global UI state emerges (for example, theme or column layout preferences persisted to `localStorage`).

## API contract the frontend assumes

The frontend treats the API as an external, versioned contract. Agree these points up front:

- JSON over HTTPS, same origin (`/api/*`) to keep cookies simple.
- **Cookie-based session** (HTTP-only, Secure, SameSite). The frontend never stores tokens in `localStorage` or `sessionStorage`.
- `GET /api/leads` accepts filter, search, sort, page size, and cursor parameters, and returns `{ items, nextCursor, prevCursor, totalEstimate }`.
- `totalEstimate` may be approximate or capped (for example, "10,000+"). The UI must label it clearly and must not depend on an exact count.
- `GET /api/filters/options` returns available values for dropdown filters.
- `GET /api/leads/:id` returns a single lead.
- Auth endpoints: login, logout, and "current user".
- Consistent error shape (`{ code, message }`) so the UI can show friendly messages.
- Shared types: generate TypeScript types from an OpenAPI spec if one exists, or keep hand-written Zod schemas in one `api/schemas` folder.

## Performance guidelines

- Never render more than one page of rows. Keep page sizes between 50 and 200.
- Virtualize the table. Memoize row and cell components. Avoid inline object or function props in hot paths.
- Code-split by route with `React.lazy`.
- Debounce search and filter changes. Cancel stale requests.
- Show skeletons and subtle loading states instead of blocking spinners.
- Budget: initial JS bundle under about 250 KB gzipped. Check with `vite-bundle-visualizer`.
- Target: table interaction feels instant; results appear in about 1 second for common queries (depends on the API).

## Accessibility and UX

- Keyboard navigable table, filters, and dialogs (Radix handles most of this).
- Visible focus states, sufficient color contrast, labelled form controls.
- Clear empty, loading, and error states for every data view.
- Responsive for laptop screens first; tablet-friendly secondary; mobile not required.

## Testing

| Layer | Tool |
|---|---|
| Unit and component | Vitest + React Testing Library |
| API mocking | MSW (Mock Service Worker) for tests and local development |
| End-to-end smoke | Playwright (login, search, filter, paginate, open detail) |
| Accessibility checks | `eslint-plugin-jsx-a11y`, `axe-core` in Playwright |

## Code quality and tooling

- **ESLint** (typescript-eslint, react-hooks, jsx-a11y) and **Prettier**.
- **Husky + lint-staged** for pre-commit checks.
- **pnpm** as package manager. Pin versions via lockfile and use current Node LTS for tooling.
- **Renovate or Dependabot** for dependency updates, reviewed monthly.
- Optional: **Storybook** for developing table and filter components in isolation.

## Suggested folder structure

```
src/
  api/            typed fetch client, Zod schemas, query hooks
  components/     shared UI (shadcn/ui wrappers, DataTable, FilterChip)
  features/
    auth/         login page, route guards
    leads/        table, filters, search, detail view
  hooks/          useDebounce, useUrlFilters, etc.
  lib/            utilities, formatters
  routes/         route definitions
  styles/         Tailwind setup, theme tokens
  main.tsx
```

## Static hosting and delivery

- Build with `vite build` and deploy the static output to **Amazon S3 behind CloudFront**.
- CloudFront serves the SPA and forwards `/api/*` to the API origin, which keeps frontend and API on the same domain.
- SPA fallback: return `index.html` for unknown paths (CloudFront custom error response).
- Cache hashed assets for a long time; keep `index.html` uncached or short-lived.
- **GitHub Actions** pipeline: install, lint, typecheck, test, build, upload to S3, invalidate CloudFront.
- Cost is expected to be minimal at this traffic level.

## Security (frontend side)

- No secrets in the frontend bundle. Only non-sensitive config via `VITE_*` variables.
- Never store auth tokens in browser storage; rely on the HTTP-only session cookie.
- React escapes content by default. Never use `dangerouslySetInnerHTML` with lead data.
- Add a Content Security Policy and standard security headers at the CloudFront layer.
- Do not log lead data to the browser console or analytics tools.
- Lead data is personal data: do not use real records in tests, screenshots, or Storybook stories.

## Alternatives considered

| Option | Verdict |
|---|---|
| Next.js | Heavier to run. No benefit for a login-gated internal tool |
| Redux Toolkit | Unneeded; TanStack Query plus URL state covers this app |
| AG Grid | Powerful, but the free edition lacks some features and it is heavier. Consider only if you need Excel-like editing |
| MUI / Ant Design | Fine, but larger bundles and harder to customize than Tailwind + shadcn/ui |
| Retool / Metabase | Faster to ship, less control over the UX. Worth a look if speed of delivery beats custom UX |
