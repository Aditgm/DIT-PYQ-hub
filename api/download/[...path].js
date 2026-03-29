const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host'
]);

function normalizeBaseUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.replace(/\/api$/i, '');
}

function resolveApiServerBase() {
  return normalizeBaseUrl(process.env.API_SERVER_URL || process.env.VITE_API_URL || '');
}

function buildTargetUrl(req, baseUrl) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const suffix = requestUrl.pathname.replace(/^\/api\/download\/?/i, '');
  const upstreamPath = suffix ? `/api/download/${suffix}` : '/api/download';
  return `${baseUrl}${upstreamPath}${requestUrl.search}`;
}

function toForwardHeaders(req) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers || {})) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (value === undefined) continue;

    // Explicitly preserve Authorization header for authentication
    if (lower === 'authorization') {
      headers.set(key, String(value));
      continue;
    }

    if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
    } else {
      headers.set(key, String(value));
    }
  }

  const hasAuthorization = headers.has('authorization');
  if (!hasAuthorization) {
    const xAuthorization = req.headers?.['x-authorization'];
    const xAuthToken = req.headers?.['x-auth-token'];

    if (xAuthorization) {
      headers.set('authorization', String(Array.isArray(xAuthorization) ? xAuthorization[0] : xAuthorization));
    } else if (xAuthToken) {
      const rawToken = String(Array.isArray(xAuthToken) ? xAuthToken[0] : xAuthToken).trim();
      if (rawToken) {
        const value = rawToken.toLowerCase().startsWith('bearer ') ? rawToken : `Bearer ${rawToken}`;
        headers.set('authorization', value);
      }
    }
  }

  return headers;
}

function toRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (req.body === undefined || req.body === null) return undefined;

  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return req.body;
  if (req.body instanceof Uint8Array) return req.body;

  return JSON.stringify(req.body);
}

function copyResponseHeaders(sourceHeaders, res) {
  for (const [key, value] of sourceHeaders.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    res.setHeader(key, value);
  }
}

export default async function handler(req, res) {
  const apiServerBase = resolveApiServerBase();

  if (!apiServerBase) {
    return res.status(500).json({
      error: 'API_SERVER_URL is not configured on Vercel',
    });
  }

  const targetUrl = buildTargetUrl(req, apiServerBase);
  
  // Debug: Log request details (remove in production)
  console.log('[download-proxy] Request:', {
    method: req.method,
    path: req.url,
    hasAuth: !!req.headers.authorization,
    authHeader: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : null,
    targetUrl
  });

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: toForwardHeaders(req),
      body: toRequestBody(req),
    });

    console.log('[download-proxy] Response:', {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText
    });

    res.statusCode = upstreamResponse.status;
    copyResponseHeaders(upstreamResponse.headers, res);

    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(responseBuffer);
  } catch (error) {
    console.error('[download-proxy] Error:', error);
    res.status(502).json({
      error: 'Failed to reach download backend',
      detail: error instanceof Error ? error.message : 'Unknown proxy error',
    });
  }
}
