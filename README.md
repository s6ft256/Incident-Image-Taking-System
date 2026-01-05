
# HSE Guardian | Incident Image Taking System

**HSE Guardian** is a professional-grade, mobile-first safety reporting tool. It is engineered for field safety personnel to capture high-integrity photographic evidence, manage incident lifecycles, and monitor site criticality in real-time.

## Professional Features

*   **Secure Access:** Biometric lock (FaceID/Fingerprint) and Password Gateway.
*   **Evidence Acquisition:** Multi-image capture with local compression and offline queueing.
*   **Command Dashboard:** Real-time data visualization of site risks and resolution status.
*   **PWA Ready:** Installable on Android and iOS for offline field operations.

## Development Setup

1.  **Clone:** `git clone <repo-url>`
2.  **Install:** `npm install`
3.  **Environment Variables**:
    *   The application uses environment variables for security. **Never commit your `.env` file to GitHub.**
    *   Create a `.env` file in the root directory.
    *   Copy the contents of `.env.example` into your new `.env` file.
    *   Fill in your specific API keys for Airtable, Supabase, and Google Gemini.
4.  **Run:** `npm run dev`


## Deployment & GitHub Workflow

To stage, commit, and sync your changes to GitHub securely:

### 1. Local Staging
Verify that your `.env` is listed in `.gitignore` (this project already does this) to prevent accidental credential leaks.
```bash
git add .
```

### 2. Synchronization
Use the built-in professional sync script which handles staging, semantic committing, and pushing in one high-integrity operation:
```bash
npm run git-sync
```

### 3. Automated CI/CD
The project includes a GitHub Actions workflow (`.github/workflows/main.yml`) that automatically triggers on every push to the `main` branch to verify build integrity.

## Developed by
@Elius - Senior Safety Systems Architect
