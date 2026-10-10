# Task 5 Brief: Leads Table & Bulk Action Bar

## Goal
Implement the central leads explorer interface strictly matching `Ref.jpg`:
1. Audience Segment Tabs (`All People (2.5m)`, `New People (1.48m)`, `Saved People (48.4k)`).
2. Action Toolbar (`✓ 6 Selected ▾`, `+ Save`, `✉ Email`, `▷ Sequence ▾`, `📋 Lists ▾`, `⤓ Export`, `✎ Edit ▾`, `☁ Salesforce ▾`).
3. Leads Data Table:
   - Built with `@tanstack/react-table`.
   - Columns matching Ref.jpg:
     1. Selection Checkbox.
     2. Name & Title: Full Name (bold font, clickable), subtitle Job Title (slate-500).
     3. Company & Industry: Company logo circle (initials or SVG icon), Company Name (medium), Industry subtitle (slate-500).
     4. Status Badge: Pill badge (`NET NEW` purple outline/text, `COLD` gray outline/text).
     5. Location: City, State / Country (e.g., "Los Angeles, California").
     6. Action CTA: `✉ View Email` button (with email icon and blue outline/text).
   - Selection state: Individual row checkbox, select all on page, bulk action counter.
   - Interactive CSV Export download when `Export` is clicked.
   - TanStack Query data fetching with loading skeleton and empty state.

## Deliverables
- `src/components/leads/AudienceTabs.tsx`:
  - Three audience tabs with live counts (`All People`, `New People`, `Saved People`).
  - Active tab indicator matching Apollo UI.
- `src/components/leads/TableActionBar.tsx`:
  - Bulk select checkbox + counter (`✓ N Selected ▾`).
  - Action buttons: `+ Save`, `✉ Email`, `▷ Sequence ▾`, `📋 Lists ▾`, `⤓ Export`, `✎ Edit ▾`, `☁ Salesforce ▾`.
  - Functional Export handler triggering CSV download from mock API.
- `src/components/leads/CompanyAvatar.tsx`:
  - Visual company badge with distinct branding colors and initials (cyan for 896 Medi, orange for SunMedia, blue for The Scratch Collective, black for Mood Media).
- `src/components/leads/StatusBadge.tsx`:
  - Badges for `NET NEW`, `COLD`, `IN SEQUENCE` with accurate borders and colors.
- `src/components/leads/LeadsTable.tsx`:
  - TanStack Table implementation with sorting, pagination, and row selection.
  - Custom cell formatters for Name+Title, Company+Industry, Status, Location, and `View Email` CTA.
  - Row click callback to trigger lead selection or detail view.
- Wire into `src/App.tsx`.
- Run `npm run build` and ensure 0 errors.
- Commit changes: `feat: implement leads table and action toolbar matching ref.jpg`.
- Report written to `.superpowers/sdd/2026-10-10-leads-dashboard-plan/task-5-report.md`.
