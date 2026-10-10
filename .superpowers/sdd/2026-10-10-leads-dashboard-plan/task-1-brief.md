# Task 1 Brief: Project Scaffolding & Design System Tokens

## Goal
Scaffold Vite + React 18+ + TypeScript SPA with Tailwind CSS, Lucide React, TanStack Query, TanStack Table, and path aliases.

## Deliverables
- `package.json`: Vite, React 18, React-DOM, TypeScript, Tailwind CSS, PostCSS, Autoprefixer, lucide-react, @tanstack/react-query, @tanstack/react-table, zod, msw.
- `vite.config.ts`: React plugin, path alias `@` -> `./src`.
- `tsconfig.json`: Strict TypeScript, path alias `"@/*": ["src/*"]`.
- `tailwind.config.js`: Colors matching Ref.jpg (slate dark dock, apollo primary blue `#0066F5`, clean borders `#E2E8F0`).
- `src/styles/globals.css`: Tailwind directives, base resets.
- `index.html`: Clean HTML shell with Inter/sans-serif typography.
- `src/main.tsx` & `src/App.tsx`: App mount point.

## Verification
- Run `npm install` (or `pnpm install`) and `npm run build`. Build must complete with 0 errors.
