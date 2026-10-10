# TASK.md

## Task: Build Frontend UI Based on Reference

Build the frontend for the internal leads dashboard ("lightweight Apollo"), using the provided UI reference image as the visual and functional guide.

## Inputs

- All Markdown files in the project: `CLAUDE.md`, `docs/TECH_STACK.md`, `docs/PROJECT_PLAN.md`, and this file.
- The UI reference image (Apollo-like). Place it at `docs/reference/` and refer to it by filename during reviews.

## 1. Read project context

- Read every `.md` file in the project directory before doing anything else.
- Study the reference image: layout, navigation, table, filter panel, typography, color palette, spacing, and component styles.
- Note any conflict between the Markdown files and the reference image, and resolve it with the user before building.

## 2. Plan before implementation

Do not create or modify any code until the plan is written and reviewed.

The plan must cover:

- **Pages and routes:** login, leads list, lead detail, and any others the reference shows.
- **Layouts:** app shell, sidebar or top navigation, filter panel, results area.
- **Components:** data table, filter controls, search bar, filter chips, detail drawer, pagination controls, empty and error states.
- **States:** loading, empty, error, no results, partial data, session expired.
- **Interactions:** search, filtering, sorting, column visibility, row selection, opening details, keyboard use.
- **Data flow:** API client, query hooks, URL-synced filters, mock API with synthetic data.
- **Design tokens:** colors, typography scale, spacing, radius, shadows, light and dark themes.
- **Work breakdown:** ordered build steps with a review checkpoint after each section.

Then review the plan critically, fix gaps, and finalize it before moving on.

## 3. Implementation approach

- Start only after the plan is finalized.
- Follow the frontend-only stack and rules in `docs/TECH_STACK.md` and `CLAUDE.md` (React, TypeScript, Vite, TanStack Query/Table/Virtual, Tailwind, shadcn/ui, Zod, MSW).
- Where a better modern, maintainable library or pattern exists, it may be used. Justify any addition in a short note and keep the bundle budget in mind.
- Build against a mocked API with synthetic data. Never use real lead data.
- Build section by section, not all at once.

## 4. Match the reference UI

After finishing each section, compare it with the reference image and check:

- Layout and grid structure
- Spacing and alignment
- Typography (family, sizes, weights, line height)
- Colors and contrast
- Component styling and states (hover, focus, active, disabled)
- Responsiveness at common laptop and tablet widths
- Overall visual hierarchy

If a section does not closely match, revise it. Repeat the review-and-refine loop until the result closely matches the reference.

## 5. Quality passes

Apply each of these review lenses before calling the work done:

| Lens | Focus |
|---|---|
| **Code Review** | Clean, readable, maintainable code. Small components, no duplication, strict TypeScript, consistent naming, sensible folder structure |
| **Security Audit** | No tokens in browser storage, no `dangerouslySetInnerHTML` with lead data, safe URL param parsing, no secrets in the bundle, CSP-friendly code, dependency check |
| **UI/UX Pro Max** | Polished, intuitive, visually strong interface. Clear hierarchy, consistent components, good empty and error states, smooth interactions |
| **Content 7 Impeccable** | Clear, concise, well-structured UI copy: labels, placeholders, error messages, empty states, tooltips |

Note: if these exist as installed skills in the environment, use them. If not, treat them as checklists and apply them manually.

## 6. Continuous self-analysis and improvement

Throughout the build, keep reviewing and improving:

- **Performance:** virtualized rows, route-level code splitting, debounced search, request cancellation, bundle under about 250 KB gzipped.
- **Accessibility:** keyboard navigation, focus management, labels, contrast, screen reader support, axe checks.
- **Responsiveness:** laptop first, tablet friendly.
- **Code quality:** lint, typecheck, and tests pass.
- **User experience:** fast feedback, no layout shifts, shareable URLs for filtered views.

## Deliverables

- A working frontend application in the repository, running against the mock API.
- The finalized implementation plan, saved as `docs/IMPLEMENTATION_PLAN.md`.
- A short review log recording, for each section, the comparison with the reference and the changes made (`docs/REVIEW_LOG.md`).
- Tests: component tests and Playwright smoke tests for login, search, filter, paginate, and open detail.
- Short README with setup, mock mode, and build instructions.

## Definition of done

- All pages and states in the plan are implemented.
- Every section has been compared to the reference and closely matches it.
- Lint, typecheck, tests, and production build all pass.
- Code Review, Security Audit, UI/UX, and Content passes are completed with findings fixed.
- No real lead data anywhere in the repo.
- The result is production-ready and closely aligned with the reference design.

## Open items to confirm before starting

1. Reference image file added to the project (needed for the visual comparison steps).
2. Final column list, filters, and default visible columns.
3. Whether dark mode, CSV export, and facet counts are in scope for this build.
4. Whether the "Code Review", "Security Audit", "UI/UX Pro Max", and "Content 7 Impeccable" skills are installed in the working environment.
