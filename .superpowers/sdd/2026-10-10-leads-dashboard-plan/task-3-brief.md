# Task 3 Brief: Shell Navigation: Dock & Top Navigation Bar

## Goal
Implement the outer application shell strictly mirroring `Ref.jpg`:
1. The leftmost dark dock (`AppDock`): 64px wide (`w-16`), dark slate (`bg-slate-900`), Apollo logo mark, vertical utility icons with active indicator on Search, bottom user profile and settings.
2. The top navigation bar (`TopHeader`): Navigation tabs (`People`, `Companies`, `Saved Searches`, `Saved Lists`), global search input with icon, job changes badge (`💼 237 New Job Changes`), quick actions, and `+ Import ▾` button.
3. App layout wrapper (`AppLayout`) integrating both.

## Deliverables
- `src/components/layout/AppDock.tsx`:
  - 64px width, dark background (`bg-slate-950` / `bg-[#0B132B]`).
  - Logo at top: Stylized Apollo `A` chevron mark in clean white/blue.
  - Middle navigation icons (lucide-react):
    - `Home` (Dashboard)
    - `Search` (Prospecting / Leads - Active state with rounded blue background and blue icon)
    - `Send` (Sequences / Outreach)
    - `Calendar` (Meetings)
    - `DollarSign` (Deals)
    - `RefreshCw` (Cadence)
    - `Phone` (Calls)
  - Bottom controls:
    - Live status ring indicator (green ping/dot)
    - `Bell` (Notifications with badge)
    - `Settings` (Configuration)
    - User avatar (circular photo/initials with online indicator)
- `src/components/layout/TopHeader.tsx`:
  - Left navigation tabs matching Ref.jpg:
    - `People` (Active tab: text-blue-600 font-semibold border-b-2 border-blue-600)
    - `Companies`
    - `Saved Searches`
    - `Saved Lists`
  - Search bar:
    - Input: `Search by name, title, location`
    - Magnifying glass icon on left, keyboard shortcut hint (`⌘K` or `/`) on right
    - Wired to search state
  - Right tools:
    - Job changes badge: `💼 237 New Job Changes` with subtle hover pill styling
    - Help / Documentation icon button
    - Notification / File icon button
    - Primary dropdown button: `+ Import ▾`
- `src/components/layout/AppLayout.tsx`:
  - Responsive layout integrating AppDock, TopHeader, and main content slot.
- Wire into `src/App.tsx`.
- Run `npm run build` and ensure 0 errors.
- Commit changes: `feat: implement app dock and top header shell matching ref.jpg`.
- Report written to `.superpowers/sdd/2026-10-10-leads-dashboard-plan/task-3-report.md`.
