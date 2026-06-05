const GRA_BASE = 'https://gra.rak.ae';

exports.handler = async function(event, context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://alhemayah.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-GRA-Cookie',
    'Access-Control-Expose-Headers': 'X-GRA-Cookies, X-GRA-Location, X-GRA-Status',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/gra-proxy', '').replace('/gra-proxy', '') || '/';
  const qs   = event.rawQuery ? '?' + event.rawQuery : '';
  const graUrl = GRA_BASE + path + qs;
  const graCookie = (event.headers['x-gra-cookie'] || event.headers['X-GRA-Cookie'] || '');

  try {
    const fetchOptions = {
      method: event.httpMethod,
      headers: {
        'Cookie': graCookie,
        'Content-Type': event.headers['content-type'] || 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Referer': GRA_BASE + '/Hemaya/Account/Login',
        'Origin': GRA_BASE,
      },
      redirect: 'manual',
    };

    if (event.httpMethod === 'POST' && event.body) {
      fetchOptions.body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString()
        : event.body;
    }

    const resp = await fetch(graUrl, fetchOptions);

    // Collect cookies
    const setCookieHeader = resp.headers.get('set-cookie') || '';
    const cookieParts = setCookieHeader
      .split(/,(?=[^;]+=[^;]+;)/)
      .map(c => c.split(';')[0].trim())
      .filter(Boolean);
    const allCookies = cookieParts.join('; ');
    const location   = resp.headers.get('location') || '';
    const contentType = resp.headers.get('content-type') || 'text/html';

    const isRedirect = resp.status === 301 || resp.status === 302;
    const body = isRedirect ? '' : await resp.text();

    return {
      statusCode: resp.status,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'X-GRA-Cookies': allCookies,
        'X-GRA-Location': location,
        'X-GRA-Status': String(resp.status),
      },
      body: body,
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
