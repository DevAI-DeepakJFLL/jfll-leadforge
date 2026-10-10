# Leads Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-performance, Apollo-like lead prospecting frontend matching `Ref.jpg` using Vite, React 18+, TypeScript, Tailwind CSS, TanStack Table & Query, and MSW for synthetic mock data.

**Architecture:** A Single Page Application (SPA) structured with an icon dock, top navigation bar, collapsible multi-facet filter pane, virtualized leads table, batch action toolbar, and slide-over lead detail drawer. Filter and search states are fully synchronized with URL search params.

**Tech Stack:** React 18+, TypeScript, Vite, Tailwind CSS, Lucide React, TanStack Table v8, TanStack Query v5, MSW (Mock Service Worker), Zod.

**Spec:** `docs/superpowers/specs/2026-10-10-leads-dashboard-design.md`

## Global Constraints
- Strictly TypeScript with no implicit or explicit untyped `any`.
- Design, layout, fonts, colors, and badge styles must mirror `Ref.jpg`.
- Zero real lead data: 100% synthetic mock datasets generated on the client via MSW.
- URL search params are the single source of truth for filtering and search queries.

---

### Task 1: Project Scaffolding & Design System Tokens
**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/globals.css`, `tailwind.config.js`, `postcss.config.js`
- Test: Verify project compiles cleanly with `pnpm build`

- [ ] **Step 1: Initialize package.json with dependencies**
  - Setup React 18, React DOM, Vite, TypeScript, Tailwind, Lucide React, TanStack Query, TanStack Table, Zod, MSW.
- [ ] **Step 2: Configure Vite, Tailwind, and TypeScript**
  - Setup path aliases `@/` pointing to `src/`.
  - Add color tokens matching Apollo UI (slate dock `#0B132B`, brand blue `#0066F5`, border `#E2E8F0`).
- [ ] **Step 3: Verify build passes**
  - Run `pnpm install` and verify build succeeds.

---

### Task 2: Type Definitions, Synthetic Data Generator & MSW Setup
**Files:**
- Create: `src/types/lead.ts` (Zod schemas and TS types for Lead, Filter, Pagination)
- Create: `src/mocks/leadsData.ts` (Realistic generator for 300+ leads with realistic company logos, titles, locations, status tags)
- Create: `src/mocks/handlers.ts` (MSW request handlers for `/api/leads`, `/api/leads/:id`, `/api/filters/options`, `/api/export`)
- Create: `src/mocks/browser.ts` (MSW worker initialization)
- Test: Vitest or quick probe verifying MSW handler responses

- [ ] **Step 1: Define Lead and Filter Zod Schemas**
  - Model `Lead`: id, name, title, company, companyLogo, industry, status ('NET NEW' | 'COLD' | 'IN SEQUENCE'), location, email, phone, employees, revenue, funding.
- [ ] **Step 2: Implement Synthetic Lead Generator**
  - Include representative leads matching `Ref.jpg` (e.g. Roberto Orci, Gail Cerrone, Jeffrey Sheridan, Marie McCarthy at 896 Medi, SunMedia, The Scratch Collective, Mood Media).
- [ ] **Step 3: Setup MSW Handlers and Browser Worker**
  - Handle search querying, multi-filtering, sorting, and pagination with mock latency (150ms).

---

### Task 3: Shell Navigation: Dock & Top Navigation Bar
**Files:**
- Create: `src/components/layout/AppDock.tsx` (64px dark vertical dock matching Ref.jpg)
- Create: `src/components/layout/TopHeader.tsx` (Header with People/Companies tabs, search input, job change badge, import button)
- Create: `src/components/layout/AppLayout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement AppDock**
  - Apollo logo, Lucide icons (Search active indicator, sequences, calendar, phone, bottom settings and avatar).
- [ ] **Step 2: Implement TopHeader**
  - Navigation tabs (`People`, `Companies`, `Saved Searches`, `Saved Lists`).
  - Search input with shortcut hint.
  - Job changes badge (`💼 237 New Job Changes`) and `+ Import ▾` button.
- [ ] **Step 3: Integrate AppLayout in App.tsx**

---

### Task 4: Filter Sidebar with Collapsible Accordions & URL Sync
**Files:**
- Create: `src/hooks/useLeadsFilter.ts` (URL query param synchronization with Zod parser)
- Create: `src/components/filters/FilterAccordion.tsx` (Collapsible sections)
- Create: `src/components/filters/FilterSidebar.tsx` (Matching Ref.jpg filters: Personas, Job Titles, Department, Location, Company, # Employees, Industry, etc.)
- Create: `src/components/filters/ActiveFilterChips.tsx` (Removable filter chips + "Clear all")

- [ ] **Step 1: Create useLeadsFilter hook**
  - Parse `q`, `jobTitles`, `departments`, `locations`, `industries`, `status` from URL and provide update helpers.
- [ ] **Step 2: Build FilterSidebar matching Ref.jpg**
  - Section headers with icons and badges.
  - Expandable checkboxes for quick filtering.
  - Pinned `+ Save Search` button at bottom.
- [ ] **Step 3: Build ActiveFilterChips bar**

---

### Task 5: Leads Table & Bulk Action Bar
**Files:**
- Create: `src/components/leads/AudienceTabs.tsx` (`All People (2.5m)`, `New People (1.48m)`, `Saved People (48.4k)`)
- Create: `src/components/leads/TableActionBar.tsx` (Selection counter `✓ N Selected ▾`, `+ Save`, `✉ Email`, `▷ Sequence`, `⤓ Export`, `✎ Edit`, `☁ Salesforce`)
- Create: `src/components/leads/LeadsTable.tsx` (TanStack Table + custom cells matching Ref.jpg)
- Create: `src/components/leads/StatusBadge.tsx` (Badges for `NET NEW`, `COLD`)
- Create: `src/components/leads/CompanyAvatar.tsx` (Circular brand badge with initials/color)

- [ ] **Step 1: Implement AudienceTabs & TableActionBar**
  - Real bulk selection count and export trigger (generates CSV file download).
- [ ] **Step 2: Build LeadsTable with TanStack Table**
  - Columns: Checkbox, Name + Title, Company logo + Name + Industry, Status Badge, Location, and `✉ View Email` button.
  - Row hover effects and selected row highlight.
- [ ] **Step 3: Connect with TanStack Query and URL Filters**
  - Display loading skeleton and empty results state.

---

### Task 6: Lead Detail Slide-Over Drawer & Email Reveal Modal
**Files:**
- Create: `src/components/leads/LeadDetailDrawer.tsx` (Slide-over drawer with full dossier)
- Create: `src/components/leads/EmailRevealDialog.tsx` (Quick reveal dialog or toast for View Email CTA)

- [ ] **Step 1: Build LeadDetailDrawer**
  - Contact information (Email, Mobile Phone, Work Phone, LinkedIn).
  - Company overview, industry, revenue, employee count.
  - Copy-to-clipboard buttons with toast feedback.
- [ ] **Step 2: Wire up row click and View Email CTA**
  - Clicking a lead row opens the drawer.
  - Clicking `View Email` reveals verified contact information.

---

### Task 7: Quality Passes, Verification & Polish
**Files:**
- Create: `tests/leads.test.tsx` (Component unit tests)
- Create: `docs/REVIEW_LOG.md` (Design comparison review log)
- Modify: `README.md` (Run, test, and build instructions)

- [ ] **Step 1: Code Review & TypeScript Check**
  - Run `pnpm tsc --noEmit` and resolve all type issues.
- [ ] **Step 2: Security & Accessibility Pass**
  - Safe URL parsing, no exposed secrets, keyboard accessible.
- [ ] **Step 3: Visual Polish & Reference Comparison**
  - Compare rendered app side-by-side with `Ref.jpg`.
  - Record findings in `docs/REVIEW_LOG.md`.
- [ ] **Step 4: Production Build Verification**
  - Run `pnpm build` and verify clean output bundle.
