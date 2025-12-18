# HSE Guardian

**HSE Guardian** is a mobile-friendly web application designed for the modern safety workforce. It streamlines the process of reporting HSE incidents, capturing photographic evidence, and managing remediation actions.

## Features

*   **Create Reports:** Capture incident details (Name, Role, Location, Observation).
*   **Offline Mode:** Fully functional without internet; auto-syncs when connection is restored.
*   **Evidence Capture:** Upload multiple images (compressed client-side) to Supabase Storage.
*   **Dashboard:** View KPI statistics, incident distribution by location, and status (Open/Closed).
*   **Incident Log:** View recent reports (last 24h) and older reports via the dashboard.
*   **Resolution:** Close out open observations with action taken details and closing evidence photos.
*   **Daily Inspiration:** Displays safety leadership quotes to promote a positive safety culture.

## Tech Stack

*   **Frontend:** React (TypeScript), Tailwind CSS
*   **Backend / Database:** Airtable (Data), Supabase (Storage)
*   **Build Tool:** Vite

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd hse-guardian
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Copy `.env.example` to `.env` and update with your credentials:
    ```bash
    cp .env.example .env
    ```
    *   Airtable Base ID & API Key
    *   Supabase URL, Key, and Bucket Name

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## How to Push to GitHub (New Repository)

1.  **Initialize Git:**
    ```bash
    git init
    ```

2.  **Add files:**
    ```bash
    git add .
    ```

3.  **Commit changes:**
    ```bash
    git commit -m "Initial commit: HSE Guardian"
    ```

4.  **Create Repository on GitHub:**
    *   Go to [github.com/new](https://github.com/new).
    *   Name your repository (e.g., `hse-guardian`).
    *   Click "Create repository".

5.  **Link and Push:**
    *   Copy the URL provided by GitHub (e.g., `https://github.com/username/hse-guardian.git`).
    *   Run the following commands:
    ```bash
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/hse-guardian.git
    git push -u origin main
    ```

## Deployment

The app is designed to be deployed on static hosting (Vercel, Netlify) or Render.

### Airtable Configuration
Ensure your Airtable base has a table named "Table 1" with the following columns:
*   Name (Single line text)
*   Role / Position (Single line text)
*   Site / Location (Single line text)
*   Observation (Long text)
*   Action taken (Long text)
*   Open observations (Attachments)
*   Closed observations (Attachments)
*   Created (Created time) - *Optional, app uses system createdTime*

## Developed by
@Elius