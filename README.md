# HSE Guardian

**HSE Guardian** is a professional-grade, mobile-first safety reporting tool. It is engineered for field personnel to capture high-integrity photographic evidence, manage incident lifecycles, and monitor site criticality in real-time.

## Professional Features

*   **Secure Access**: Password Gateway and site-specific personnel identity verification.
*   **Evidence Acquisition**: Multi-image capture with local compression and offline queueing.
*   **AI Analysis**: Automated hazard profile assessment using Google Gemini.
*   **Command Dashboard**: Real-time data visualization of site risks and resolution status.
*   **PWA Ready**: Installable on Android and iOS for offline field operations.

## Development Setup

1.  **Clone**: `git clone <repo-url>`
2.  **Install**: `npm install`
3.  **Environment Variables**:
    *   Create a `.env` file in the root directory.
    *   Fill in your specific API keys for Airtable, Supabase, and Google Gemini.
    *   *See `AIRTABLE_SETUP_GUIDE.md` for specific database schema requirements.*
4.  **Run**: `npm run dev`

## Deployment & GitHub Workflow

Release & commit workflows are intentionally unopinionated. Configure your own release automation or use standard Git commands for staging, committing, and pushing. If you'd like, you can add a project-specific `git-sync` script to `package.json` or set up a GitHub Action for release automation.

## Optional: Python Analytics for Dashboard

The dashboard can optionally display offline-generated analytics (JSON + PNG charts) produced with Python (pandas / scikit-learn / matplotlib).

1. Install Python deps: `pip install -r python/requirements.txt`
2. Provide CSV exports (defaults):
    - `data/observations.csv`
    - `data/incidents.csv`
3. Generate assets into the web app: `python3 python/generate_dashboard_assets.py --outdir public/dashboard-assets`

If `public/dashboard-assets/summary.json` exists, the app will render an "Analytics Snapshot" section on the main dashboard. If it does not exist, nothing changes.

## Developed by
@Elius - Senior Safety Systems Architect

