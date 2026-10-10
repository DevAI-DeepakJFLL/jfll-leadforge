# Apollo Leads Sourcing & Prospecting Dashboard

A lightweight, high-performance, pixel-accurate B2B lead prospecting dashboard frontend built with React 18, TypeScript, Tailwind CSS, TanStack Query, and TanStack Table. Faithfully replicates the enterprise Apollo prospecting user interface (`Ref.jpg`).

---

## 🌟 Key Features

- **Pixel-Accurate Shell & Dock**:
  - Compact 64px vertical app dock with Apollo logo chevron mark, navigation icons with active glow pills, operational green pulse indicator, notifications, and profile controls.
  - Top navigation bar featuring entity tabs (`People`, `Companies`, `Saved Searches`, `Saved Lists`), omni-search input with `⌘K` keyboard shortcut, and `💼 237 New Job Changes` badge.

- **Deep Multi-Faceted Filter Sidebar**:
  - 13 collapsible accordion filter categories (Saved Lists, Personas, Job Titles, Department, Location, Company, # Employees, Industry, Owner, Buying Intent, Technologies, Revenues, Funding).
  - Dynamic facet option counts populated from mock intelligence data.
  - "Load Search" preset button (instantly loads the Los Angeles, CA Marketing & Advertising search from `Ref.jpg`).
  - Active filter chips bar above the table with category tags and one-click removal / clear-all.

- **Bidirectional URL State Synchronization**:
  - All filter criteria (`q`, `jobTitles`, `departments`, `locations`, `industries`, `status`, `companySize`, `page`, `tab`, `sort`) are mirrored in URL search parameters.
  - Full browser back/forward navigation support (`popstate` synchronization).

- **Audience Segmentation**:
  - Audience tabs matching the reference: `All People (2.5m)`, `New People (1.48m)`, `Saved People (48.4k)`.
  - Dynamic prospect counts calculated in real-time based on active search criteria.

- **Bulk Action Toolbar**:
  - Selection dropdown button (`✓ 6 Selected ▾`) with indeterminate checkbox support.
  - Selection scopes: Select All on Page, Select All Matching, Deselect All.
  - Bulk actions: `+ Save` to pipeline, `✉ Email` composer, `▷ Sequence ▾`, `📋 Lists ▾`, `✎ Edit ▾`, `☁ Salesforce ▾`.
  - **Functional CSV Export**: Downloads RFC-4180 compliant `apollo_leads_export.csv` containing all lead attributes with properly escaped values.

- **Interactive Leads Table**:
  - Branded company avatars matching `Ref.jpg` (cyan `896 Medi`, orange `SunMedia`, blue `The Scratch Collective`, dark `Mood Media`).
  - Color-coded stage badges (`NET NEW` purple pill, `COLD` slate pill, `IN SEQUENCE` blue pill).
  - Multi-page pagination controls with dynamic page clamps and row range summaries.

- **Slide-over Lead Dossier Drawer & Email Reveal Modal**:
  - **Lead Detail Drawer**: Right-sliding drawer with frosted backdrop overlay, company intelligence, contact details, technology stack, discovery timeline, and pipeline save toggle.
  - **Email Reveal Dialog**: Modal triggered directly from the `✉ View Email` button displaying verified work email, 100% deliverability indicator, one-click copy feedback, and outreach CTAs.

- **Built-in Toast Notification System**:
  - Non-intrusive notifications for copy actions, bulk operations, pipeline updates, and error alerts.

---

## 🛠️ Tech Stack

- **Framework**: [React 18.3](https://react.dev/)
- **Language**: [TypeScript 5.7](https://www.typescriptlang.org/) (Strict Mode)
- **Build Tool**: [Vite 6.1](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/)
- **State & Data Fetching**: [TanStack Query v5](https://tanstack.com/query) (React Query)
- **Table Virtualization / Rows**: [TanStack Table v8](https://tanstack.com/table)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Validation**: [Zod 3.24](https://zod.dev/)
- **Mocking**: [Mock Service Worker (MSW) 2.7](https://mswjs.io/)
- **Testing**: [Vitest 5.0](https://vitest.dev/)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### Installation

```bash
# Clone the repository and enter directory
cd "Lead Sourcing Tool"

# Install project dependencies
npm install
```

### Running Locally (Development Mode)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The application will start in mock mode with realistic synthetic B2B leads.

### Running Automated Tests

```bash
npm test
```

Runs 33 unit and integration tests verifying filtering logic, search queries, pagination, bulk selection, saved state mutations, URL query sync, and CSV export.

### Production Build

```bash
npm run build
```

Performs strict TypeScript type checking (`tsc`) followed by Vite production bundling into `dist/`.

To preview the production build locally:

```bash
npm run preview
```

---

## 🔌 Mock API & Architecture

The application includes a fully functional, zero-external-dependency mock backend:

1. **Mock Service Worker (MSW)**:
   - Worker registered in `public/mockServiceWorker.js`.
   - Intercepts requests to `/api/*` in the browser with realistic network delays (100–150ms).
2. **Fetch Fallback Layer**:
   - `src/mocks/fetchFallback.ts` automatically intercepts `window.fetch` if service workers are disabled (e.g. strict enterprise sandbox, file:// protocol, or private browsing).
3. **In-Memory Reactive Store**:
   - `src/mocks/leadsService.ts` maintains state for pagination, filtering, sorting, bookmarking, and CSV exports.

### Supported API Endpoints

- `GET /api/leads` - Paginated, filtered, sorted leads dataset.
- `GET /api/leads/:id` - Full profile for a single lead.
- `GET /api/filters/options` - Dynamic facet categories with aggregate counts.
- `POST /api/leads/save` - Batch save/unsave leads in pipeline.
- `PATCH /api/leads/:id/save` - Toggle saved state for an individual lead.
- `POST /api/leads/export` - Export selected leads or filtered query results as CSV.

---

## 📂 Project Architecture

```
src/
├── components/
│   ├── filters/           # Filter accordion sidebar, active chips, facet filters
│   │   ├── FilterSidebar.tsx
│   │   ├── FilterAccordion.tsx
│   │   └── ActiveFilterChips.tsx
│   ├── layout/            # Application dock, top header navigation, app shell
│   │   ├── AppDock.tsx
│   │   ├── TopHeader.tsx
│   │   └── AppLayout.tsx
│   ├── leads/             # Leads table, action bar, detail drawer, email modal
│   │   ├── LeadsTable.tsx
│   │   ├── TableActionBar.tsx
│   │   ├── AudienceTabs.tsx
│   │   ├── CompanyAvatar.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── LeadDetailDrawer.tsx
│   │   └── EmailRevealDialog.tsx
│   └── ui/                # UI primitives (Toast notifications, badges)
│       └── Toast.tsx
├── hooks/
│   └── useLeadsFilter.ts  # Filter state hook with URL bidirectional synchronization
├── mocks/
│   ├── leadsData.ts       # Synthetic B2B leads dataset matching Ref.jpg
│   ├── leadsService.ts    # In-memory query engine, facet aggregator & CSV generator
│   ├── handlers.ts        # MSW request handlers
│   ├── browser.ts         # MSW browser worker initializer
│   └── fetchFallback.ts   # Client fetch fallback for worker-restricted environments
├── styles/
│   └── globals.css        # Tailwind directives and design tokens
├── test/
│   └── leads.test.ts      # Comprehensive Vitest test suite (33 tests)
├── types/
│   └── lead.ts            # Zod schemas and TypeScript interface definitions
├── App.tsx                # Main dashboard view orchestrating queries, table & drawer
└── main.tsx               # Application bootstrap with MSW initialization
```

---

## 📖 Visual Alignment & Review Log

A detailed, itemized comparison between the target reference design (`Ref.jpg`) and this implementation is maintained in [docs/REVIEW_LOG.md](docs/REVIEW_LOG.md).
