# Copilot instructions for this repository

Purpose: concise, actionable guidance so an AI coding agent can be immediately productive in this codebase.

- Quick start
  - Dev: `npm run dev` (runs `vite`).
  - Local server: `npm start` (runs `node server.js`).
  - Build: `npm run build` then `npm run deploy` (deploy is a passthrough to `build`).
  - Node requirement: `>=18.x` (see `package.json`).

- Big picture architecture
  - Frontend: TypeScript React app built with Vite. Entry points: `index.tsx` and `App.tsx`.
  - Backend/light server: `server.js` — used for local/static serving and small server-side hooks.
  - Persistence: SQL schema files (`database.sql`, `SUPABASE_AUTO_DELETE.sql`) indicate Supabase-ready DB usage; `@supabase/supabase-js` is a dependency.
  - Integrations: `services/` contains wrappers for external systems: `airtableService.ts`, `githubService.ts`, `biometricService.ts`, `trainingService.ts`, `weatherService.ts`, and `notificationService.ts`.
  - Offline/sync: `services/offlineStorage.ts`, `services/syncService.ts` manage local persistence and background synchronization.

- Data flow and conventions
  - UI → hooks → services: Components in `components/` call custom hooks in `hooks/` (e.g., `useIncidentReport.ts`, `useIncidentReportForm.ts`) which orchestrate calls to `services/*` and `utils/*` helpers.
  - App-wide state: `context/AppContext.tsx` provides global state and feature flags. Prefer reading/writing state via that context when cross-component sharing is required.
  - Image handling: image conversion/compression utilities live in `utils/` (`fileToBase64.ts`, `imageCompression.ts`). Consumers: `components/ImageGrid.tsx`, `components/ImageAnnotator.tsx`, and many forms.
  - Notification pattern: use `services/notificationService.ts` rather than ad-hoc toasts for consistent UX and retry semantics.

- Project-specific patterns to follow
  - Service modules export small, promise-returning functions and avoid embedding UI logic; follow the style in `services/storageService.ts` and `services/syncService.ts`.
  - Hooks encapsulate form/state logic; keep side-effects inside hooks or service calls (see `hooks/useIncidentReportForm.ts`).
  - Prefer small focused components in `components/` (many files follow this rule; keep new UI pieces single-responsibility).
  - Offline-first: presume data may be saved locally first. New code that mutates reports should consider `offlineStorage` + `syncService` rather than immediate remote-only writes.

- Important files to inspect when making changes
  - `App.tsx` and `index.tsx` — app bootstrap and routing.
  - `server.js` — local server behavior and any server-side endpoints.
  - `context/AppContext.tsx` — global state and providers.
  - `hooks/useIncidentReport.ts`, `hooks/useIncidentReportForm.ts` — canonical hooks for report flow.
  - `services/syncService.ts`, `services/storageService.ts`, `services/offlineStorage.ts` — offline/sync/storage behavior.
  - `components/ImageAnnotator.tsx`, `components/ImageGrid.tsx`, `components/CreateReportForm.tsx` — image/report handling examples.
  - `database.sql` and `SUPABASE_AUTO_DELETE.sql` — DB shape and retention rules.

- External integrations and notes
  - Supabase client is used (`@supabase/supabase-js`). Watch for environment variable usage for keys/secrets (not committed here).
  - Airtable, GitHub, biometric, and Google GenAI imports indicate external API calls — respect network error handling and rate limits in `services/*`.

- Example quick tasks for an agent
  - Add a new field to the incident report form: update `components/IncidentReportForm.tsx`, add state/validation in `hooks/useIncidentReportForm.ts`, persist via `services/storageService.ts` and ensure offline behavior via `services/offlineStorage.ts`.
  - Add background sync retry: update `services/syncService.ts` to add exponential backoff, keeping existing API surface used by `hooks/*`.

- What not to change without human review
  - SQL schema files and `server.js` startup behavior (these may affect deployed data and runtime).
  - Production integration code (Airtable/GitHub/Supabase credentials or infra changes).

If anything in this guide is unclear or you'd like additional examples (code snippets or new task templates), tell me which area to expand.
