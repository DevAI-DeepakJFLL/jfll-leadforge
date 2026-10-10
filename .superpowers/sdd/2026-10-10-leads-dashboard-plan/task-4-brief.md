# Task 4 Brief: Filter Sidebar with Collapsible Accordions & URL Sync

## Goal
Implement the left filter panel exactly matching `Ref.jpg`:
1. Accordions with category icons, labels, badges, and expand/collapse carets.
2. Filter state synchronized bi-directionally with browser URL search parameters (`window.location.search`).
3. Active filter chips bar with dismiss pill tags and a "Clear all" button.
4. Pinned `+ Save Search` button at bottom and `↻ Load Search` in header.

## Reference Accordion Categories (`Ref.jpg`)
Header: `Filters` + `↻ Load Search` action button
- `≡ Saved Lists` (List selection presets)
- `👤 Personas` (Preset persona filters: C-Level, VP, Director, Engineering Leaders)
- `💼 Job Titles` (Search input + checkboxes: Executive, VP, Director, Manager, Founder)
- `🏛️ Department` (Marketing, Sales, Engineering, Finance, Operations, Human Resources)
- `📍 Location` (Search input + checkboxes: Los Angeles, New York, San Francisco, Chicago, London)
- `🏢 Company` (Company name search filter)
- `👥 # Employees` (1-10, 11-50, 51-200, 201-500, 501-1000, 1000+)
- `📑 Industry & Keywords` (Marketing & Advertising, Technology, Logistics, Retail, Financial Services)
- `👤 Owner`
- `📈 Buying Intent`
- `⚙️ Technologies`
- `$ Revenues`
- `💳 Funding`
Bottom action: `+ Save Search` button

## Deliverables
- `src/hooks/useLeadsFilter.ts`:
  - Hook managing filter state (`q`, `jobTitles`, `departments`, `locations`, `industries`, `status`, `companySize`, `page`, `tab`).
  - URL query string parsing & pushState/replaceState synchronization.
  - Safe defaults when URL parameters are invalid or empty.
- `src/components/filters/FilterAccordion.tsx`:
  - Reusable collapsible section with icon, title, count badge, and expand/collapse caret.
- `src/components/filters/FilterSidebar.tsx`:
  - Full filter pane (256px / `w-64` or `w-72`), sticky, scrollable.
  - Displays all 13 categories from Ref.jpg with interactive options for the primary filtering attributes.
  - Header with `Filters` and `↻ Load Search`.
  - Pinned bottom button `+ Save Search`.
- `src/components/filters/ActiveFilterChips.tsx`:
  - Horizontal chip list showing active filters (e.g. `Location: Los Angeles ✕`, `Industry: Marketing ✕`).
  - "Clear all" button when filters are active.
- Wire into `src/App.tsx`.
- Run `npm run build` and ensure 0 errors.
- Commit changes: `feat: implement filter sidebar with accordions and url sync matching ref.jpg`.
- Report written to `.superpowers/sdd/2026-10-10-leads-dashboard-plan/task-4-report.md`.
