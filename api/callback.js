const axios = require('axios');

module.exports = async (req, res) => {
  const CLIENT_ID = process.env.AIRTABLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI;

  const { code, error } = req.query;

  if (error) {
    res.status(400).send(`Error from Airtable: ${error}`);
    return;
  }

  if (!code) {
    res.status(400).send('No authorization code received.');
    return;
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

    res.setHeader('Content-Type', 'text/html');
    res.end(`
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
};
