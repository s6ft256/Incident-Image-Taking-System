/**
 * Airtable OAuth Callback Server
 * 
 * This is a standalone Node.js server.
 * Do not import this into the React app.
 * Deploy this file + package.json to Render.com.
 */

const express = require('express');
const axios = require('axios');
const Buffer = require('buffer').Buffer;
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Environment variables (Set these in Render Dashboard)
const CLIENT_ID = process.env.AIRTABLE_CLIENT_ID;
const CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; // e.g., https://your-app.onrender.com/callback

// Basic health check
app.get('/', (req, res) => {
  res.send('Airtable OAuth Server is running. Use /auth to start login.');
});

// 1. Redirect user to Airtable Login
app.get('/auth', (req, res) => {
  const state = crypto.randomUUID(); // In production, store this in a cookie to verify later
  // Scopes: data.records:read, data.records:write, schema.bases:read
  const scope = 'data.records:read data.records:write schema.bases:read';
  
  const authUrl = `https://airtable.com/oauth2/v1/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
  
  res.redirect(authUrl);
});

// 2. Handle Callback
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`Error from Airtable: ${error}`);
  }

  if (!code) {
    return res.status(400).send('No authorization code received.');
  }

  try {
    // Exchange code for tokens
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

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // SECURITY NOTE:
    // In a real app, DO NOT display tokens to the user.
    // Store them in a database associated with the user's session.
    // For this helper tool, we display them so you can copy them to your Google AI Studio project.
    
    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: green;">Authorization Successful</h1>
          <p>Copy these credentials to your application:</p>
          <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; word-break: break-all;">
            <p><strong>Access Token:</strong> ${access_token}</p>
            <p><strong>Refresh Token:</strong> ${refresh_token}</p>
          </div>
          <p>You can close this window.</p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('Token Exchange Error:', err.response?.data || err.message);
    res.status(500).send('Failed to exchange token. Check server logs.');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});