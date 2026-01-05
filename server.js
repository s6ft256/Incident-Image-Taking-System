/**
 * Airtable OAuth Callback Server & Static File Server
 * 
 * This server handles:
 * 1. Serving the compiled React Frontend (dist/ folder)
 * 2. OAuth Callback logic for Airtable
 */

const express = require('express');
const axios = require('axios');
const path = require('path');
const Buffer = require('buffer').Buffer;
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Accept JSON bodies for proxy endpoints
app.use(express.json({ limit: '10mb' }));

// Environment variables (Set these in Render Dashboard)
const CLIENT_ID = process.env.AIRTABLE_CLIENT_ID;
const CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; 

// --- 1. Serve Static Frontend ---
// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// --- 2. OAuth Routes ---

// Redirect user to Airtable Login
app.get('/auth', (req, res) => {
  const state = crypto.randomUUID();
  const scope = 'data.records:read data.records:write schema.bases:read';
  const authUrl = `https://airtable.com/oauth2/v1/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.redirect(authUrl);
});

// Handle Callback
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`Error from Airtable: ${error}`);
  }

  if (!code) {
    return res.status(400).send('No authorization code received.');
  }

  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await axios.post('https://airtable.com/oauth2/v1/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      }), 
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: green;">Authorization Successful</h1>
          <p>Copy these credentials to your application:</p>
          <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; word-break: break-all;">
            <p><strong>Access Token:</strong> ${access_token}</p>
            <p><strong>Refresh Token:</strong> ${refresh_token}</p>
          </div>
          <p>You can close this window and return to the Incident Reporter.</p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('Token Exchange Error:', err.response?.data || err.message);
    res.status(500).send('Failed to exchange token. Check server logs.');
  }
});

// --- Server-side Airtable Proxy ---
// These endpoints forward requests to Airtable using server-side secrets.
// Configure AIRTABLE_BASE_ID and AIRTABLE_API_KEY in your deployment (not VITE_ vars).
app.get('/api/airtable/:table', async (req, res) => {
  const base = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!base || !apiKey) return res.status(500).json({ error: 'Server misconfigured: missing Airtable credentials.' });

  try {
    const table = req.params.table;
    const qs = new URLSearchParams(req.query).toString();
    const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}${qs ? '?' + qs : ''}`;
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.post('/api/airtable/:table', async (req, res) => {
  const base = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!base || !apiKey) return res.status(500).json({ error: 'Server misconfigured: missing Airtable credentials.' });

  try {
    const table = req.params.table;
    const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`;
    const response = await axios.post(url, req.body, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } });
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

// --- 3. SPA Fallback ---
// For any request that doesn't match an API route or static file, send index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});