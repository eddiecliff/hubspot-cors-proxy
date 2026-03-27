const crypto = require('crypto');

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const REDIRECT_URI_PATH = '/api/auth/callback';

const SCOPES = [
    'crm.objects.contacts.read',
    'crm.objects.companies.read',
    'crm.objects.deals.read',
    'crm.schemas.contacts.read',
    'crm.schemas.companies.read',
    'crm.schemas.deals.read',
].join(' ');

module.exports = async function handler(req, res) {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'HUBSPOT_CLIENT_ID not configured' });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = protocol + '://' + host + REDIRECT_URI_PATH;

    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
        client_id: clientId,
        scope: SCOPES,
        redirect_uri: redirectUri,
        state: state,
    });

    const authUrl = HUBSPOT_AUTH_URL + '?' + params.toString();
    return res.redirect(302, authUrl);
};
