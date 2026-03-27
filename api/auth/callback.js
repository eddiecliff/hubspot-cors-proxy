const TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';
const REDIRECT_URI_PATH = '/api/auth/callback';

module.exports = async function handler(req, res) {
    const code = req.query.code;
    const error = req.query.error;
    const errorDescription = req.query.error_description;

    if (error) {
        return res.status(200).send(errorPage(errorDescription || error));
    }

    if (!code) {
        return res.status(200).send(errorPage('No authorization code received from HubSpot.'));
    }

    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return res.status(200).send(errorPage('Server misconfigured: missing OAuth credentials.'));
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = protocol + '://' + host + REDIRECT_URI_PATH;

    try {
        const tokenResponse = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code: code,
            }).toString(),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            const msg = tokenData.message || tokenData.error_description || 'Token exchange failed';
            return res.status(200).send(errorPage(msg));
        }

        return res.status(200).send(successPage({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
        }));
    } catch (err) {
        return res.status(200).send(errorPage('Failed to exchange authorization code: ' + err.message));
    }
};

function successPage(tokens) {
    const payload = JSON.stringify({
        type: 'HUBSPOT_OAUTH_SUCCESS',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
    });

    return '<!DOCTYPE html>\n<html>\n<head><title>HubSpot Connected</title></head>\n<body>\n<p>Connected! This window will close automatically.</p>\n<script>\n(function() {\n    if (window.opener) {\n        window.opener.postMessage(' + payload + ', \'*\');\n    }\n    setTimeout(function() { window.close(); }, 1500);\n})();\n</script>\n</body>\n</html>';
}

function errorPage(message) {
    var safeMsg = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var errPayload = JSON.stringify({ type: 'HUBSPOT_OAUTH_ERROR', error: message });
    return '<!DOCTYPE html>\n<html>\n<head><title>HubSpot Connection Failed</title></head>\n<body>\n<h3>Connection Failed</h3>\n<p>' + safeMsg + '</p>\n<p>You can close this window and try again.</p>\n<script>\n(function() {\n    if (window.opener) {\n        window.opener.postMessage(' + errPayload + ', \'*\');\n    }\n})();\n</script>\n</body>\n</html>';
}
