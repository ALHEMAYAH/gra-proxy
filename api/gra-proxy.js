const GRA_BASE = 'https://gra.rak.ae';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://alhemayah.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-GRA-Cookie');
  res.setHeader('Access-Control-Expose-Headers', 'X-GRA-Cookies, X-GRA-Location, X-GRA-Status');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const path = req.url.replace('/gra-proxy', '') || '/';
  const graUrl = GRA_BASE + path;
  const graCookie = req.headers['x-gra-cookie'] || '';

  try {
    let body = undefined;
    if (req.method === 'POST') {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
    }

    const graResp = await fetch(graUrl, {
      method: req.method,
      headers: {
        'Cookie': graCookie,
        'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9',
        'Referer': GRA_BASE + '/Hemaya/Account/Login',
      },
      body: body,
      redirect: 'manual',
    });

    // Collect ALL Set-Cookie headers properly
    const rawHeaders = graResp.headers.raw ? graResp.headers.raw() : {};
    let cookieParts = [];
    
    if (rawHeaders['set-cookie']) {
      // Node-fetch v2 style
      rawHeaders['set-cookie'].forEach(c => {
        const nameVal = c.split(';')[0].trim();
        if (nameVal) cookieParts.push(nameVal);
      });
    } else {
      // Fallback: parse combined header
      const setCookie = graResp.headers.get('set-cookie') || '';
      if (setCookie) {
        setCookie.split(/,(?=[^;]+=)/).forEach(c => {
          const nameVal = c.split(';')[0].trim();
          if (nameVal) cookieParts.push(nameVal);
        });
      }
    }

    const allCookies = cookieParts.join('; ');
    const location = graResp.headers.get('location') || '';
    const contentType = graResp.headers.get('content-type') || 'text/html';
    const isRedirect = graResp.status === 301 || graResp.status === 302;
    const respBody = isRedirect ? '' : await graResp.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-GRA-Cookies', allCookies);
    res.setHeader('X-GRA-Location', location);
    res.setHeader('X-GRA-Status', String(graResp.status));
    res.status(graResp.status).send(respBody);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
