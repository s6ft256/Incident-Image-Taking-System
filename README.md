
# HSE Guardian | Incident Image Taking System

**HSE Guardian** is a professional-grade, mobile-first safety reporting tool. It is engineered for field safety personnel to capture high-integrity photographic evidence, manage incident lifecycles, and monitor site criticality in real-time.

## Professional Features

*   **Secure Access:** Biometric lock (FaceID/Fingerprint) and Password Gateway.
*   **Evidence Acquisition:** Multi-image capture with local compression and offline queueing.
*   **Command Dashboard:** Real-time data visualization of site risks and resolution status.
*   **HSECES Assistant:** AI-powered expert for Critical Equipment and Safety Systems.
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
git commit -m "feat: implement biometric security and enhanced incident evidence grid"
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
