# Deploying Airtable OAuth Server to Render.com

Follow these steps to deploy the OAuth callback server (`server.js`) to Render.com for free.

## 1. Prepare your Code

1.  Push your code (including `server.js` and `package.json`) to a **GitHub Repository** (private or public).

## 2. Create Service on Render

1.  Log in to [dashboard.render.com](https://dashboard.render.com).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub account and select the repository you just created.
4.  **Name**: e.g., `my-airtable-auth`
5.  **Region**: Closest to you.
6.  **Branch**: `main` (or master).
7.  **Runtime**: `Node`.
8.  **Build Command**: `npm install`
9.  **Start Command**: `node server.js`
10. **Instance Type**: Select **Free**.

## 3. Configure Environment Variables

Scroll down to the "Environment Variables" section in Render and add these:

| Key | Value |
| --- | --- |
| `AIRTABLE_CLIENT_ID` | Your OAuth Client ID from Airtable |
| `AIRTABLE_CLIENT_SECRET` | Your OAuth Client Secret from Airtable |
| `REDIRECT_URI` | `https://<your-render-service-name>.onrender.com/callback` |

*Note: You can find the `<your-render-service-name>` at the top of the page (e.g., `my-airtable-auth-x9z.onrender.com`).*

## 4. Configure Airtable

1.  Go to [Airtable Builder Hub](https://airtable.com/create/oauth).
2.  Select your OAuth Integration.
3.  Under **Redirect URIs**, add your Render URL:
    `https://<your-render-service-name>.onrender.com/callback`
4.  Save changes.

## 5. Usage

1.  Visit `https://<your-render-service-name>.onrender.com/auth` in your browser.
2.  You will be redirected to Airtable to authorize.
3.  After authorization, you will be redirected back to your Render app.
4.  The screen will display your **Access Token** and **Refresh Token**.
5.  Copy these tokens for use in your main application.