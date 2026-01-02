
# HSE Guardian | Incident Image Taking System

**HSE Guardian** is a professional-grade, mobile-first safety reporting tool. It is engineered for field safety personnel to capture high-integrity photographic evidence, manage incident lifecycles, and monitor site criticality in real-time.

## Professional Features

*   **Secure Access:** Password-based gateway and support for secure device-level authentication.
*   **Evidence Acquisition:** Multi-image capture with local compression and offline queueing.
*   **Command Dashboard:** Real-time data visualization of site risks and resolution status.
*   **PWA Ready:** Installable on Android and iOS for offline field operations.

## Deployment & GitHub Workflow

To stage, commit, and sync your changes to GitHub, use the following professional workflow:

### 1. Local Staging
Stage all modified files for the next commit:
```bash
git add .
```

### 2. High-Integrity Committing
Commit your changes with a descriptive message following semantic versioning principles:
```bash
git commit -m "feat: update security and enhanced incident evidence grid"
```

### 3. Repository Synchronization
Push your local commits to the remote GitHub repository:
```bash
git push origin main
```

### 4. Automated CI/CD
The project includes a GitHub Actions workflow (`.github/workflows/main.yml`) that automatically triggers on every push to the `main` branch to verify build integrity.

## Development Setup

1.  **Clone:** `git clone <repo-url>`
2.  **Install:** `npm install`
3.  **Run:** `npm run dev`

## Developed by
@Elius - Senior Safety Systems Architect

## Deploying to Vercel

This project is pre-configured for Vercel. Basic steps:

1. Create a new project in the Vercel dashboard and link your GitHub repository.
2. In Vercel project Settings -> Environment Variables, add the following keys (set values from your provider):
	- `VITE_AIRTABLE_BASE_ID`
	- `VITE_AIRTABLE_API_KEY`
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
	- `VITE_SUPABASE_BUCKET`
	- `AIRTABLE_CLIENT_ID`
	- `AIRTABLE_CLIENT_SECRET`
	- `REDIRECT_URI` (set to `https://<your-vercel-domain>/callback`)
	- Optional: `VITE_AUTH_VIDEO_BG` to override the auth screen video URL

Build settings:

- Framework Preset: `Other` (or `Static`)
- Build Command: `npm run vercel-build`
- Output Directory: `dist`

Notes:
- The OAuth callback endpoint is implemented as a serverless function at `api/callback.js` and routed via `vercel.json`.
- The SPA fallback route is configured in `vercel.json` to serve `index.html` for client-side routing.
- Use the `vercel` CLI or dashboard to trigger deployments; pushing to `main` will auto-deploy when linked.

