# IMPLEMENTATION_PLAN.md

## High-Level Objective
Build a lightweight, highly responsive "Apollo-like" leads prospecting dashboard frontend for internal use based on `Ref.jpg` and the specifications in `TECH_STACK.md`, `PROJECT_PLAN.md`, and `TASK.md`.

---

## 1. Reference UI Analysis (`Ref.jpg`)

### 1.1 Structural Layout & Visual Architecture
1. **Leftmost Icon Sidebar (Dark/Minimal Navigation Bar)**:
   - Width: ~64px (compact dock).
   - Top logo: stylized Apollo/Lambda-like geometric chevron (`A`).
   - Main vertical navigation icons: Home/Dashboard, Search/Leads (active, highlighted blue icon or pill), Sequences/Paper Plane, Calendar/Meetings, Deals/Dollar, Refresh/Cadence, Phone/Call.
   - Bottom icons: Green status dot/ring, Bell (Notifications), Settings (Gear), User Profile Avatar.
2. **Top Navigation Bar (Header)**:
   - Left tabs: `People` (active blue underline/text), `Companies`, `Saved Searches`, `Saved Lists`.
   - Center/Right search bar: `Search by name, title, location` with leading search icon.
   - Top right status & actions:
     - Badge/Link: `💼 237 New Job Changes`
     - Quick action icons: Help/Docs, Notification/File
     - Primary/Secondary action button: `+ Import ▾`
3. **Filter Left Sidebar (Collapsible Filter Pane)**:
   - Header: `Filters` title + `↻ Load Search` text button.
   - Accordion filter sections with icons and expand/collapse carets:
     - `≡ Saved Lists`
     - `👤 Personas`
     - `💼 Job Titles`
     - `🏛️ Department`
     - `📍 Location`
     - `🏢 Company`
     - `👥 # Employees`
     - `📑 Industry & Keywords`
     - `👤 Owner`
     - `📈 Buying Intent`
     - `⚙️ Technologies`
     - `$ Revenues`
     - `💳 Funding`
   - Bottom pinned action: `+ Save Search` button.
4. **Main Content / Results Panel**:
   - **Tab bar (Audience segments)**:
     - `All People (2.5m)` (active blue pill / text)
     - `New People (1.48m)`
     - `Saved People (48.4k)`
   - **Action Bar (Bulk Selection & Tooling)**:
     - Bulk Select checkbox + count badge: `✓ 6 Selected ▾`
     - Action buttons:
       - `+ Save`
       - `✉ Email`
       - `▷ Sequence ▾`
       - `📋 Lists ▾`
       - `⤓ Export`
       - `✎ Edit ▾`
       - `☁ Salesforce ▾`
   - **Data Table / Lead Rows**:
     - Modern spacious row layout (not cramped legacy spreadsheet, clean cards/rows).
     - **Columns**:
       1. **Selection checkbox**
       2. **Name & Title**:
          - Lead Full Name (bold font, clickable to open Lead Detail Drawer)
          - Subtitle: Job Title (e.g. "Executive Vice President, Strategic Growth")
       3. **Company & Industry**:
          - Company logo / favicon circular badge
          - Company Name (bold)
          - Industry (e.g. "Marketing & Advertising")
       4. **Stage / Status Badge**:
          - Badges: `NET NEW` (purple outline/subtle pill), `COLD` (gray outline pill), etc.
       5. **Location**:
          - City, State / Country (e.g. "Los Angeles, California")
       6. **Action CTA**:
          - Primary ghost/outline button: `✉ View Email` (opens lead contact info / verification popup or drawer)
5. **Detail Drawer (Slide-over)**:
   - Clicking a lead row or "View Email" opens a sliding drawer from the right.
   - Contains: Contact details (Email, Phone, LinkedIn URL, Location), Company Overview, Technologies, Experience history, Copy-to-clipboard utilities, Notes.

---

## 2. Technology Stack & Architecture

- **Framework**: React 18+ with TypeScript (strict mode enabled).
- **Build Tool**: Vite.
- **Routing**: TanStack Router (or React Router v6) with type-safe URL query sync.
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives).
- **Icons**: `lucide-react`.
- **Data Fetching & Caching**: TanStack Query (React Query) v5 with `keepPreviousData` support.
- **Data Table**: TanStack Table v8 + TanStack Virtual for virtualized high-performance row scrolling.
- **Forms & Validation**: React Hook Form + Zod.
- **API Mocking**: MSW (Mock Service Worker) with realistic, 100% synthetic B2B lead datasets.
- **Testing**: Vitest + React Testing Library + Playwright.

---

## 3. Pages, Routes & URL State

1. **Routes**:
   - `/login` - Clean authentication screen (email & password, mock validation, error states).
   - `/` or `/leads` - Main prospect explorer (Left icon nav + filter sidebar + table + header).
   - `/leads/:id` or Drawer URL param `?selectedLeadId=xyz` - Leads explorer with active detail drawer.
2. **URL State Synchronization**:
   - All filters (`q`, `jobTitles`, `departments`, `locations`, `companySize`, `industries`, `status`, `page`, `sort`, `tab`) are mirrored in URL search params with Zod validation.
   - Deep-linking, browser history (back/forward), and bookmarking work seamlessly.

---

## 4. Work Breakdown & Implementation Steps

### Phase 1: Project Scaffolding & Setup
- Initialize Vite React TypeScript project.
- Configure Tailwind CSS, PostCSS, Radix UI primitives, `lucide-react`, and theme tokens (matching Apollo color palette: crisp white backgrounds, subtle border `#E2E8F0`, Apollo primary blue `#0066F5` / `#2563EB`, neutral slate text `#0F172A`).
- Set up project directory structure as defined in `TECH_STACK.md`:
  `src/api/`, `src/components/`, `src/features/`, `src/hooks/`, `src/lib/`, `src/styles/`.

### Phase 2: Synthetic Data & MSW Mock API
- Define Zod schemas and TypeScript types for `Lead`, `FilterOptions`, `SearchQuery`, `LeadListResponse`.
- Generate realistic, rich synthetic dataset (300+ diverse mock leads with avatar colors, company logos, titles, locations, emails, phone numbers, employee counts, revenue, funding).
- Set up MSW handlers:
  - `GET /api/leads` (server-side filtering, sorting, cursor pagination, estimated count).
  - `GET /api/leads/:id` (detailed profile).
  - `GET /api/filters/options` (dynamic facet options).
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

### Phase 3: Shell & Navigation Matching `Ref.jpg`
- Leftmost Dark Icon Dock (`AppSidebar`):
  - Apollo logo, vertical tool icons, active indicators, bottom profile & settings.
- Header (`TopNavBar`):
  - Top navigation tabs (`People`, `Companies`, etc.).
  - Global Search input with instant keyboard focus shortcut (`/` or `Cmd+K`).
  - Job changes indicator badge and `+ Import` button.

### Phase 4: Filter Sidebar (`FiltersPane`)
- Collapsible accordion for filter categories matching `Ref.jpg`:
  - Personas, Job Titles, Department, Location, Company, # Employees, Industry, etc.
- Interactive multi-select checklists with search within filter values.
- URL param synchronization with debouncing.
- Active filter chips bar with "Clear all" and individual badge dismissals.
- Saved Search CTA button at bottom.

### Phase 5: Leads Data Table (`LeadsTable`)
- Segment tabs (`All People (2.5m)`, `New People (1.48m)`, `Saved People (48.4k)`).
- Batch action toolbar:
  - Bulk select checkbox + counter ("6 Selected").
  - Action buttons (`+ Save`, `✉ Email`, `▷ Sequence`, `Lists`, `Export`, `Edit`, `Salesforce`).
- TanStack Table + TanStack Virtual:
  - Sticky header with sorting indicators.
  - Custom cell formatters:
    - Lead name + Job title.
    - Company icon + Company name + Industry.
    - Stage Badge (`NET NEW`, `COLD`, `IN SEQUENCE`).
    - Location.
    - `View Email` action CTA button.
  - Hover states, selection states, checkbox toggle.
- Skeleton loading and empty/error states.

### Phase 6: Lead Detail Drawer (`LeadDetailDrawer`)
- Slide-over sheet showing comprehensive lead dossier.
- Tabs/Sections: Contact Info (Email with verification badge, Phone, LinkedIn), Company Profile, Experience, Sourcing Activity.
- One-click copy for email, phone, and links with toast notifications.

### Phase 7: Quality Passes & Verification
- **Code Review**: Strict TypeScript checks, zero any types, component decomposition.
- **Security Audit**: Sanitization, safe URL parsing, no stored tokens.
- **UI/UX Pro Max**: Visual alignment check against `Ref.jpg`, hover/active states, smooth animations.
- **Impeccable Content**: Clear copy, tooltips, error boundaries, accessible ARIA labels.
- **Tests**: Vitest component tests and build verification (`pnpm build`).
