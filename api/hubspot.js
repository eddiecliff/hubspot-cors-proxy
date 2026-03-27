const HUBSPOT_API_BASE = 'https://api.hubapi.com';

const ALLOWED_PATHS = [
    '/crm/v3/properties/',
    '/crm/v3/objects/',
    '/crm/v3/schemas',
    '/account-info/v3/api-usage/daily',
    '/oauth/v1/access-tokens/',
];

function isAllowedPath(path) {
    return ALLOWED_PATHS.some((prefix) => path.startsWith(prefix));
}

function setCorsHeaders(res, origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-HubSpot-Token');
    res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = async function handler(req, res) {
    const origin = req.headers.origin || '*';
    setCorsHeaders(res, origin);

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const hsToken = req.headers['x-hubspot-token'];
    if (!hsToken) {
        return res.status(401).json({ error: 'Missing X-HubSpot-Token header' });
    }

    const hsPath = req.query.path;
    if (!hsPath) {
        return res.status(400).json({ error: 'Missing ?path= query parameter' });
    }

    if (!isAllowedPath(hsPath)) {
        return res.status(403).json({ error: 'Path not allowed: ' + hsPath });
    }

    const queryParams = Object.assign({}, req.query);
    delete queryParams.path;
    const qs = new URLSearchParams(queryParams).toString();
    const url = HUBSPOT_API_BASE + hsPath + (qs ? '?' + qs : '');

    try {
        const fetchOptions = {
            method: req.method === 'POST' ? 'POST' : 'GET',
            headers: {
                'Authorization': 'Bearer ' + hsToken,
                'Content-Type': 'application/json',
            },
        };

        if (req.method === 'POST' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(502).json({ error: 'Proxy request failed', details: error.message });
    }
};
