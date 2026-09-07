import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const upstreamRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    const body = await upstreamRes.arrayBuffer();
    
    // Forward headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'text/html');
    
    return res.status(upstreamRes.status).send(Buffer.from(body));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
