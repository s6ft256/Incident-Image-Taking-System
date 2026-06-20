# Vercel Deployment & Credentials Guide

Since security credentials have been removed from the source code, you must configure them in Vercel for your application to work.

## 1. Gather Your Credentials
You will need the following values. If you do not have them, check your Airtable and Supabase dashboards.

*   **Airtable Personal Access Token (PAT)**: Create one at [airtable.com/create/tokens](https://airtable.com/create/tokens) with scopes `data.records:read` and `data.records:write`.
*   **Airtable Base ID**: Found in your Airtable API documentation (usually starts with `app...`).
*   **Supabase URL & Anon Key**: Found in Supabase > Project Settings > API.

## 2. Configure Vercel
1.  Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Select your **Incident-Image-Taking-System** project.
3.  Navigate to **Settings** > **Environment Variables**.
4.  Add the following variables one by one:

| Key | Value Description |
| :--- | :--- |
| `VITE_AIRTABLE_BASE_ID` | Your Base ID (e.g., `appXyZ...`) |
| `VITE_AIRTABLE_API_KEY` | Your new Personal Access Token (starts with `pat...`) |
| `VITE_SUPABASE_URL` | Your Project URL (e.g., `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your `anon` public key |
| `VITE_SUPABASE_BUCKET` | The storage bucket name (default: `incident-images`) |
| `VITE_GEMINI_API_KEY` | (Optional) Your Google Gemini API key for AI features |
| `VITE_ARCHIVE_ACCESS_KEY`| (Optional) Archive access password (default: `HSE2025`) |

## 3. Redeploy
**Crucial Step**: Because this is a Vite application, environment variables are embedded into the JavaScript code **during the build process**.

1.  After saving the variables, go to the **Deployments** tab in Vercel.
2.  Click the three dots (`...`) on your latest deployment.
3.  Select **Redeploy**.
4.  Wait for the build to finish. Your app will now have access to the credentials.

## Troubleshooting
*   **401/403 Errors**: Verify your Airtable PAT has the correct scopes (`data.records:read` and `data.records:write`) and access to the specific Base.
*   **Offline Mode**: If credentials are missing, the app may default to "Offline Mode" behavior. check the browser console (F12) for "Missing configuration" warnings.
