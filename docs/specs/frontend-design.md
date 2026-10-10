# Leads Sourcing Dashboard ("Lightweight Apollo") Spec

**Date:** 2026-10-10  
**Status:** Approved  
**Reference:** `Ref.jpg` / `docs/reference/Ref.jpg`

---

## 1. Goal & Product Vision
Build a fast, lightweight internal leads sourcing dashboard frontend ("Lightweight Apollo") for a 5-person sales and sourcing team. The application enables users to search, filter, select, and view millions of global lead records via a mock API (MSW) with zero latency lag, high responsiveness, and visual parity with the provided reference design (`Ref.jpg`).

---

## 2. Visual Architecture & Layout Specification (Matching `Ref.jpg`)

### 2.1 Outer Shell & Dock Navigation
- **Dock / Leftmost Sidebar**:
  - Width: `w-16` (64px), compact dark slate background (`bg-slate-900` / `#0B132B`).
  - Top: Apollo-like chevron logo mark (`A`).
  - Nav icons (lucide-react):
    - `Home` (Dashboard)
    - `Search` (Leads Explorer - Active with blue highlight indicator)
    - `Send` (Sequences / Outreach)
    - `Calendar` (Meetings)
    - `DollarSign` (Deals)
    - `RefreshCw` (Cadences)
    - `Phone` (Calls)
  - Bottom:
    - Status beacon ring (Green connection indicator)
    - `Bell` (Notifications with indicator)
    - `Settings` (Preferences)
    - User Avatar with status dot

### 2.2 Header / Top Navigation Bar
- **Height**: `h-14` (56px), border-b border-slate-200 bg-white.
- **Left Navigation Tabs**:
  - `People` (Active, blue bottom indicator border, text-blue-600 font-semibold)
  - `Companies`
  - `Saved Searches`
  - `Saved Lists`
- **Center-Right Search Input**:
  - Magnifying glass icon, text: `Search by name, title, location...`
  - Keyboard shortcut pill (`/` or `⌘K`)
- **Right Action Items**:
  - Job changes badge: `💼 237 New Job Changes` (interactive link)
  - Quick action icons: Help/Docs, File/Notification
  - Primary button: `+ Import ▾`

### 2.3 Filter Sidebar (Left Panel)
- **Width**: `w-64` (256px), sticky panel with vertical scroll.
- **Header**:
  - Title: `Filters`
  - Action: `↻ Load Search` (ghost button)
- **Collapsible Filter Groups**:
  - `≡ Saved Lists`
  - `👤 Personas`
  - `💼 Job Titles` (Multi-select: Executive, VP, Director, Manager)
  - `🏛️ Department` (Multi-select: Marketing, Sales, Engineering, Finance, Operations)
  - `📍 Location` (Multi-select / input: Los Angeles, New York, San Francisco, Chicago, London)
  - `🏢 Company` (Company search)
  - `👥 # Employees` (Ranges: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+)
  - `📑 Industry & Keywords` (Marketing & Advertising, Technology, Logistics, Retail)
  - `👤 Owner`
  - `📈 Buying Intent`
  - `⚙️ Technologies`
  - `$ Revenues`
  - `💳 Funding`
- **Bottom Pinned Button**:
  - `+ Save Search` button

### 2.4 Main Leads Explorer Area
- **Audience Segment Tabs**:
  - `All People (2.5m)` (Active blue pill, count label)
  - `New People (1.48m)`
  - `Saved People (48.4k)`
- **Action Toolbar**:
  - Bulk select checkbox with count drop: `✓ N Selected ▾`
  - Action buttons:
    - `+ Save`
    - `✉ Email`
    - `▷ Sequence ▾`
    - `📋 Lists ▾`
    - `⤓ Export` (Triggers mock CSV export download)
    - `✎ Edit ▾`
    - `☁ Salesforce ▾`
- **Data Table Layout**:
  - Virtualized rows for high performance.
  - Columns:
    1. **Checkbox**: Row selection toggle.
    2. **Name & Title**:
       - Contact name (e.g. "Roberto Orci", font-semibold, hover:text-blue-600, opens detail drawer)
       - Subtitle: Job title (e.g. "Executive Vice President, Strategic Growth", text-slate-500 text-xs)
    3. **Company & Industry**:
       - Circular brand badge with initials/icon (e.g. "896 Medi", cyan badge)
       - Company Name (font-medium text-slate-900)
       - Industry subtitle (e.g. "Marketing & Advertising", text-slate-500 text-xs)
    4. **Status / Stage Badge**:
       - Pill badges: `NET NEW` (purple text/border), `COLD` (gray text/border), `IN SEQUENCE` (blue text/border).
    5. **Location**:
       - City, State / Country (e.g. "Los Angeles, California", text-slate-700 text-sm)
    6. **Action CTA**:
       - Button: `✉ View Email` (opens contact modal / quick reveal with simulated email and phone)

### 2.5 Slide-over Lead Detail Drawer
- Sliding panel from right (`w-[480px]`).
- Lead header: Avatar, Name, Job title, Company, Stage badge.
- Quick action buttons: Copy Email, Copy Phone, Open LinkedIn.
- Sections:
  - **Contact Information**: Direct Email, Work Email, Mobile Phone, Headquarters Phone, Social Profiles.
  - **Company Dossier**: Name, Industry, Headcount, Founded, Annual Revenue, Tech Stack.
  - **Activity & Notes**: Sourcing timeline, notes feed.

---

## 3. Data Flow & Synthetic API Contract (MSW)

- **Endpoints**:
  - `GET /api/leads`:
    - Query parameters: `q`, `jobTitle`, `department`, `location`, `companySize`, `industry`, `status`, `page`, `limit`, `sortBy`, `sortOrder`.
    - Response: `{ items: Lead[], totalEstimate: number, totalFormatted: string, page: number, totalPages: number }`.
  - `GET /api/leads/:id`:
    - Response: `LeadDetail`.
  - `GET /api/filters/options`:
    - Response: Available facets with counts.
  - `POST /api/leads/export`:
    - Generates downloadable CSV content.
- **Client Cache**: TanStack Query v5 with `placeholderData: keepPreviousData`.
- **URL Synchronization**: Custom hook synchronizing filter state with browser query params using Zod schema validation.
