# Task 6 Brief: Lead Detail Slide-Over Drawer & Email Reveal Modal

## Goal
Implement interactive lead inspection tools:
1. `LeadDetailDrawer`: Slide-over dossier drawer displaying complete lead intelligence (Full name, job title, company, status badge, verified email, direct phone, office phone, location, company headcount, revenue, funding, technology stack, and activity timeline).
2. `EmailRevealDialog`: Quick modal or inline reveal triggered by the `✉ View Email` button in each table row, showing verified work email, deliverability score, copy-to-clipboard button, and phone numbers.
3. Interactive clipboard actions with feedback notification toasts.

## Deliverables
- `src/components/leads/LeadDetailDrawer.tsx`:
  - Slide-over sheet from right (`w-[480px]` or responsive).
  - Header: Avatar/Initials, Name, Job title, Company link, Status badge, and close button (`✕` or `Esc`).
  - Contact Section: Work email with verification badge, direct phone, HQ phone, LinkedIn URL.
  - Company Dossier: Industry, headcount range, estimated annual revenue, funding stage, technologies.
  - Quick action toolbar: Copy Email, Copy Phone, Save Lead toggle, Add to List, Add to Sequence.
- `src/components/leads/EmailRevealDialog.tsx`:
  - Modal or popover when `View Email` is clicked in any table row.
  - Shows verified email (e.g., `roberto.orci@896medi.com`), verification status pill (`Verified 100% Deliverable`), direct phone, and copy button.
- `src/components/ui/Toast.tsx` (or custom toast notification system):
  - Toast notification when copying email/phone to clipboard or exporting leads.
- Wire into `src/App.tsx` and `src/components/leads/LeadsTable.tsx`.
- Run `npm run build` and ensure 0 errors.
- Commit changes: `feat: implement lead detail drawer and email reveal modal`.
- Report written to `.superpowers/sdd/2026-10-10-leads-dashboard-plan/task-6-report.md`.
