const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const ALLOWED_PATHS = ['/crm/v3/properties/','/crm/v3/objects/','/crm/v3/schemas','/account-info/v3/api-usage/daily','/oauth/v1/access-tokens/'];
function isAllowedPath(path) { return ALLOWED_PATHS.some(p => path.startsWith(p)); }
function corsHeaders(origin) { return { 'Access-Control-Allow-Origin': origin || '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-HubSpot-Token', 'Access-Control-Max-Age': '86400' }; }
export default async function handler(req, res) {
    const origin = req.headers.origin || '*';
    const headers = corsHeaders(origin);
    if (req.method === 'OPTIONS') return res.status(204).set(headers).end();
    const hsToken = req.headers['x-hubspot-token'];
    if (!hsToken) return res.status(401).set(headers).json({ error: 'Missing X-HubSpot-Token header' });
    const hsPath = req.query.path;
    if (!hsPath) return res.status(400).set(headers).json({ error: 'Missing ?path= query parameter' });
    if (!isAllowedPath(hsPath)) return res.status(403).set(headers).json({ error: 'Path not allowed: ' + hsPath });
    const queryParams = { ...req.query }; delete queryParams.path;
    const qs = new URLSearchParams(queryParams).toString();
    const url = HUBSPOT_API_BASE + hsPath + (qs ? '?' + qs : '');
    try {
        const fetchOpts = { method: req.method === 'POST' ? 'POST' : 'GET', headers: { 'Authorization': 'Bearer ' + hsToken, 'Content-Type': 'application/json' } };
        if (req.method === 'POST' && req.body) fetchOpts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const response = await fetch(url, fetchOpts);
        const data = await response.json();
        return res.status(response.status).set(headers).json(data);
    } catch (error) { return res.status(502).set(headers).json({ error: 'Proxy request failed', details: error.message }); }
}
