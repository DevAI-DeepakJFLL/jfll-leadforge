# Task 2 Brief: Type Definitions, Synthetic Data Generator & MSW Setup

## Goal
Implement TypeScript type definitions and Zod schemas for leads and filters, generate a rich synthetic dataset of 300+ realistic B2B leads mirroring `Ref.jpg`, and setup MSW (Mock Service Worker) for client-side API simulation.

## Deliverables
- `src/types/lead.ts`:
  - `Lead` interface and Zod schema: `id`, `name`, `title`, `company`, `companyLogo` (or logo color/initials), `industry`, `status` (`'NET NEW' | 'COLD' | 'IN SEQUENCE'`), `location`, `email`, `phone`, `employees`, `revenue`, `funding`, `saved`.
  - `FilterParams` interface and Zod schema (`q`, `jobTitles`, `departments`, `locations`, `industries`, `status`, `companySize`, `page`, `limit`, `sortBy`, `sortOrder`, `tab`).
  - `LeadsResponse` interface (`items: Lead[]`, `totalEstimate: number`, `totalFormatted: string`, `page: number`, `totalPages: number`, `audienceCounts: { all: number, new: number, saved: number }`).
- `src/mocks/leadsData.ts`:
  - Generate 300+ synthetic leads.
  - MUST include leads seen in `Ref.jpg`:
    - Roberto Orci | Executive Vice President, Strategic Growth | 896 Medi (cyan logo) | Marketing & Advertising | NET NEW | Los Angeles, California | roberto.orci@896medi.com
    - Gail Cerrone | President | SunMedia (orange star/logo) | Marketing & Advertising | COLD | Los Angeles, California | gail@sunmedia.io
    - Jeffrey Sheridan | Vice President | The Scratch Collective (blue logo) | Marketing & Advertising | NET NEW | Los Angeles, California | jeff@thescratchcollective.com
    - Marie McCarthy | Vice President Risk Management | Mood Media (black logo) | Marketing & Advertising | COLD | Los Angeles, California | marie.m@moodmedia.com
    - Plus additional realistic leads across Tech, Logistics, Finance, Healthcare in New York, San Francisco, Chicago, London, etc.
- `src/mocks/handlers.ts`:
  - `GET /api/leads`: Server-side filtering by query string, job title, industry, location, status, audience tab (`all`, `new`, `saved`), pagination (default 25 per page), and sorting.
  - `GET /api/leads/:id`: Single lead fetch.
  - `GET /api/filters/options`: Dynamic counts for facets.
  - `POST /api/leads/export`: Downloadable mock CSV.
- `src/mocks/browser.ts`:
  - Initialize MSW browser worker (`setupWorker`).
- Update `src/main.tsx` to start MSW worker before React render (with graceful fallback).
- Run `npm run build` to verify type safety and clean build.
- Commit changes: `feat: implement lead schemas, synthetic dataset and msw mock api`.
- Report written to `.superpowers/sdd/2026-10-10-leads-dashboard-plan/task-2-report.md`.
