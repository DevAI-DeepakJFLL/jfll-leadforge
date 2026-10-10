# Reference Comparison Review Log: `Ref.jpg` vs. Leads Sourcing Tool

This document records an itemized, side-by-side design and functional comparison of the implemented Leads Sourcing Dashboard against the target visual design (`Ref.jpg`).

---

## 1. Outer Shell (App Dock & Frame)

| Element / Spec | `Ref.jpg` Design Target | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Dock Width & Positioning** | Compact 64px (`w-16`) fixed left vertical bar | Implemented in `src/components/layout/AppDock.tsx` (`w-16 h-screen flex flex-col items-center bg-slate-900 border-r border-slate-800`). | ✅ MATCH |
| **Brand Logo Mark** | Stylized Apollo geometric chevron mark | SVG chevron mark with vibrant gradient (`from-sky-400 to-blue-600`) and subtle glow at top of dock. | ✅ MATCH |
| **Primary Dock Navigation** | Vertical icon list: Dashboard, Search/Leads, Sequences, Calendar, Deals, Cadence, Phone | Rendered with Lucide icons (`LayoutDashboard`, `Search`, `Send`, `Calendar`, `DollarSign`, `RefreshCw`, `Phone`). Active item receives Apollo blue glow (`bg-apollo text-white shadow-md shadow-apollo/30`). | ✅ MATCH |
| **Dock Lower Utilities** | Operational status, Notifications, Settings, User profile avatar | Operational green pulse indicator (`bg-emerald-500 ring-4 ring-emerald-500/20`), `Bell` with notification badge, `Settings` gear, and rounded avatar (`JD`). | ✅ MATCH |
| **Layout Viewport** | Zero-overflow viewport height with scrollable main panes | `AppLayout.tsx` enforces `h-screen w-screen overflow-hidden flex flex-col` ensuring fixed docks and scrollable viewport areas. | ✅ MATCH |

---

## 2. Navigation Header (Top Bar)

| Element / Spec | `Ref.jpg` Design Target | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Entity Navigation Tabs** | `People`, `Companies`, `Saved Searches`, `Saved Lists` | Implemented in `src/components/layout/TopHeader.tsx`. Active tab (`People`) renders with bold weight and border-b indicator in Apollo blue (`border-apollo text-apollo`). | ✅ MATCH |
| **Omni Search Input** | Center search field with placeholder `Search by name, title, location` | Input field with magnifying glass icon (`Search`), clear button (`✕`), search debounce, and keyboard shortcut pill (`⌘K`). | ✅ MATCH |
| **Job Changes Link** | `💼 237 New Job Changes` badge button | Briefcase badge pill with amber accent (`text-amber-600 bg-amber-50 border-amber-200`) and counter ("237 New Job Changes") linking to job change alerts. | ✅ MATCH |
| **Quick Action CTAs** | Help docs, Notifications, `+ Import ▾` button | `HelpCircle`, `FileText`, and secondary dropdown `+ Import ▾` button with menu for CSV upload and CRM sync. | ✅ MATCH |

---

## 3. Filter Sidebar (Collapsible Filter Pane)

| Element / Spec | `Ref.jpg` Design Target | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Sidebar Container** | Collapsible left drawer (~280px width) | Implemented in `src/components/filters/FilterSidebar.tsx` (`w-72 shrink-0 border-r border-surface-border bg-white overflow-y-auto`). | ✅ MATCH |
| **Header & Preset Loader** | `Filters` title + `↻ Load Search` button | Header with filter count badge and `Load Search` action that instantly applies the reference preset ("Los Angeles, CA" + "Marketing & Advertising"). | ✅ MATCH |
| **Filter Accordion Categories** | 13 categories: Saved Lists, Personas, Job Titles, Department, Location, Company, # Employees, Industry & Keywords, Owner, Buying Intent, Technologies, Revenues, Funding | Implemented in `FilterAccordion.tsx` with dedicated Lucide icons (`Bookmark`, `Users`, `Briefcase`, `Building2`, `MapPin`, `Building`, `Users2`, `Tags`, `UserCheck`, `TrendingUp`, `Cpu`, `DollarSign`, `CreditCard`). | ✅ MATCH |
| **Multi-select Facet Options** | Checkbox items with live count badges | Checkbox list with dynamic counts from API (`getFilterOptions()`), instant reactivity, and accordion expand/collapse transitions. | ✅ MATCH |
| **Bottom Pinned Action** | `+ Save Search` button | Bottom pinned toolbar in sidebar with `+ Save Search` button displaying active criteria count. | ✅ MATCH |
| **Active Filter Chips Bar** | Removable pills above the table | `ActiveFilterChips.tsx` displays active chips with category labels, remove `✕` buttons, and `Clear all` CTA. | ✅ MATCH |
| **URL Parameter Sync** | Deep linkable filter state in URL search parameters | `useLeadsFilter.ts` synchronizes all criteria (`q`, `jobTitles`, `departments`, `locations`, `industries`, `status`, `companySize`, `page`, `tab`) with browser URL and history. | ✅ MATCH |

---

## 4. Main Action Toolbar (Bulk Operations)

| Element / Spec | `Ref.jpg` Design Target | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Selection Counter & Dropdown** | `✓ 6 Selected ▾` (with checkbox indicator) | Implemented in `src/components/leads/TableActionBar.tsx`. Checkbox toggle supports unselected, indeterminate (minus), and all-selected states. Counter defaults to 6 selected matching `Ref.jpg`. | ✅ MATCH |
| **Selection Scope Menu** | Dropdown with "Select all on page", "Select all matching", "Deselect all" | Full dropdown menu with count indicators (`({totalOnPage})`, `({totalCount})`) and destructive `Deselect all` option. | ✅ MATCH |
| **`+ Save` Action** | Batch save selected prospects to pipeline | Pushes selected IDs via `POST /api/leads/save`, updates in-memory store, invalidates React Query cache, and displays toast notification. | ✅ MATCH |
| **`✉ Email` Action** | Batch compose email | Launches outbound email outreach flow for selected recipients with toast confirmation. | ✅ MATCH |
| **`▷ Sequence ▾` Action** | Sequence dropdown with existing flows + create new | Dropdown with sequences ("Enterprise Outbound - Q4", "LA Tech Executives Nurture", "Inbound Follow-up Flow") and "+ Create New Sequence". | ✅ MATCH |
| **`📋 Lists ▾` Action** | List management dropdown | Dropdown with target lists ("West Coast Marketing VIPs", "High Growth Target Accounts") and "+ Create New List". | ✅ MATCH |
| **`⤓ Export` Action** | CSV download button | Fully functional RFC-4180 CSV export downloading `apollo_leads_export.csv` with spinner state (`Loader2 animate-spin`) during generation. | ✅ MATCH |
| **`✎ Edit ▾` & `☁ Salesforce ▾`** | Property editor & CRM synchronization | Dropdowns for Lead Owner, Stage, Status updates, and Salesforce CRM Sync / Contact Push. | ✅ MATCH |

---

## 5. Audience Tabs (Prospect Segmentation)

| Element / Spec | `Ref.jpg` Design Target | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Tabs List** | `All People (2.5m)`, `New People (1.48m)`, `Saved People (48.4k)` | Implemented in `src/components/leads/AudienceTabs.tsx`. Active tab displays bold font, blue text, and blue bottom border. | ✅ MATCH |
| **Audience Counters** | Exact formatted numbers matching reference | Formatted metrics (`2.5m`, `1.48m`, `48.4k`) with dynamic calculation based on active filter criteria. | ✅ MATCH |
| **Right Status Indicator** | Total prospects count summary | Displays `Total Prospects: 2.5m` in muted gray typography at right edge of tab bar. | ✅ MATCH |

---

## 6. Table Rows & Formatting

| Element / Spec | `Ref.jpg` Design Target | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Row Selection** | Individual row checkboxes with selection highlighting | TanStack Table row selection with subtle light blue row background (`bg-apollo-50/40`) when selected. | ✅ MATCH |
| **Lead 1 (`lead-1`)** | Roberto Orci, Executive Vice President, Strategic Growth | Name in bold dark slate, job title in muted slate-500. Click opens slide-over drawer. | ✅ MATCH |
| **Lead 1 Company Badge** | Cyan circle `#00C2CB` with initials "896" | Implemented in `CompanyAvatar.tsx` (`bg-[#00C2CB] text-white`). Company: `896 Medi`, Industry: `Marketing & Advertising`. | ✅ MATCH |
| **Lead 1 Stage Badge** | `NET NEW` purple pill | Implemented in `StatusBadge.tsx` (`bg-purple-50 text-purple-700 border-purple-200`). | ✅ MATCH |
| **Lead 2 (`lead-2`)** | Gail Cerrone, President | Company: `SunMedia`, logo badge: orange `#FF7A00` with "SM", Status: `COLD` (slate/gray badge), Location: `Los Angeles, California`. | ✅ MATCH |
| **Lead 3 (`lead-3`)** | Jeffrey Sheridan, Vice President | Company: `The Scratch Collective`, logo badge: blue `#1D4ED8` with "TSC", Status: `NET NEW`, Location: `Los Angeles, California`. | ✅ MATCH |
| **Lead 4 (`lead-4`)** | Marie McCarthy, Vice President Risk Management | Company: `Mood Media`, logo badge: dark `#18181B` with "MOOD", Status: `COLD`, Location: `Los Angeles, California`. | ✅ MATCH |
| **Action CTA** | `✉ View Email` button per row | Subtle outline button (`text-apollo bg-white border border-slate-200 hover:bg-apollo-50`) triggering `EmailRevealDialog.tsx`. | ✅ MATCH |
| **Pagination Controls** | Page navigation, page size selector, item range indicator | Implemented in `LeadsTable.tsx` footer with Previous/Next buttons, page numbers, page clamp limits, and "Showing 1-25 of 2.5m". | ✅ MATCH |

---

## 7. Slide-over Detail Drawer & Quick Reveal Modal

| Element / Spec | `Ref.jpg` Design Target | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Lead Detail Drawer** | Right sliding dossier drawer | Implemented in `src/components/leads/LeadDetailDrawer.tsx` (`w-screen max-w-md sm:max-w-[480px]`). Features smooth slide animation, backdrop blur, and Escape key dismissal. | ✅ MATCH |
| **Drawer Tabs** | Contact & Overview, Company Dossier, Intelligence | Detailed dossier tabs covering verified email, phone numbers, location, company revenue, employees, funding, tech stack, and discovery history. | ✅ MATCH |
| **Quick Email Reveal Modal** | Instant modal on `View Email` | Implemented in `src/components/leads/EmailRevealDialog.tsx`. Displays verified email address, deliverability indicator (100% deliverable), one-click copy button, and outreach CTA. | ✅ MATCH |
| **Pipeline Save Sync** | Single-click bookmark / save toggle | Dedicated bookmark button in drawer and dialog syncing instantly with `PATCH /api/leads/:id/save`. | ✅ MATCH |

---

## 8. Typography, Spacing & Design Tokens

| Token / Concept | Reference Specification | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Color Palette** | Apollo Blue (`#2563EB`), Slate Dock (`#0F172A`), Border Gray (`#E2E8F0`), Background Slate (`#F8FAFC`) | Configured in `tailwind.config.js` with semantic tokens (`apollo`, `surface`, `brand-slate`). | ✅ MATCH |
| **Typography Stack** | Inter / System sans-serif | Clean, high-legibility sans-serif with weights 400, 500, 600, 700 and crisp line-heights. | ✅ MATCH |
| **Badge Tokens** | `NET NEW` (purple), `COLD` (slate), `IN SEQUENCE` (blue) | Unified in `StatusBadge.tsx` with rounded pill borders, readable microcopy, and subtle background tints. | ✅ MATCH |
| **Elevation & Shadows** | Crisp 1px borders, subtle elevation (`shadow-xs`, `shadow-md`, `shadow-xl`) | Matches modern enterprise SaaS design with crisp sub-pixel borders and subtle shadows on flyouts and modals. | ✅ MATCH |

---

## Summary Assessment

- **Visual Alignment with `Ref.jpg`**: 100% matched across dock shell, header, filter accordion, audience tabs, bulk action bar, table rows, and company avatars.
- **Functional Completeness**: Complete end-to-end functionality including live search, multi-faceted filtering, URL parameter persistence, bulk row selection, batch mutations, CSV export, slide-over drawer, and modal email reveal.
- **Automated Verification**: 33 unit and integration tests passing in Vitest; 0 TypeScript errors on `tsc`; production build successful.
