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
4.  **Run**: `npm run dev`

## Deployment & GitHub Workflow

Use the built-in professional sync script which handles staging, semantic committing, and pushing in one high-integrity operation:
```bash
npm run git-sync
```

## Developed by
@Elius - Senior Safety Systems Architect