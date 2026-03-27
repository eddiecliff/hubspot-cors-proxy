const TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';

function setCorsHeaders(res, origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = async function handler(req, res) {
    var origin = req.headers.origin || '*';
    setCorsHeaders(res, origin);

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var clientId = process.env.HUBSPOT_CLIENT_ID;
    var clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'Server misconfigured: missing OAuth credentials' });
    }

    var refreshToken = req.body && req.body.refresh_token;
    if (!refreshToken) {
        return res.status(400).json({ error: 'Missing refresh_token in request body' });
    }

    try {
        var tokenResponse = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
            }).toString(),
        });

        var tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            var msg = tokenData.message || tokenData.error_description || 'Token refresh failed';
            return res.status(tokenResponse.status).json({ error: msg });
        }

        return res.status(200).json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
        });
    } catch (err) {
        return res.status(502).json({ error: 'Token refresh failed', details: err.message });
    }
};
