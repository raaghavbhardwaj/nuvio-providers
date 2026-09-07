/**
 * @fileoverview Vercel Serverless Function / Edge API for Cinejoy streaming.
 * Handles the binary gateway handshake on AWS Lambda / Node and exposes a clean JSON endpoint
 * for Nuvio's QuickJS runtime.
 */

const CINEJOY_ORIGIN = 'https://cinejoy.to';
const CINEJOY_REFERER = 'https://cinejoy.to/';
const API_GATEWAY_URL = 'https://api.shegu.st';
const SUBTITLES_API_URL = 'https://subtitles.shegu.st';
const ENC_DEC_API_URL = 'https://enc-dec.app/api';

const SERVERS = ['Lisbon', 'Nebula', 'Solara', 'Joy'];

const CINEJOY_HEADERS = {
  Accept: '*/*',
  Origin: CINEJOY_ORIGIN,
  Referer: CINEJOY_REFERER,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
};

async function fetchSubtitles(mediaType, tmdbId, season, episode) {
  try {
    const typeParam = mediaType === 'tv' ? 'series' : 'movie';
    let url = `${SUBTITLES_API_URL}/subtitles?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}`;
    if (mediaType === 'tv' && season && episode) {
      url += `&season=${season}&episode=${episode}`;
    }

    const res = await fetch(url, { headers: CINEJOY_HEADERS });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.subtitles || !Array.isArray(data.subtitles)) return [];

    return data.subtitles
      .filter(sub => sub.url && typeof sub.url === 'string')
      .map(sub => ({
        url: sub.url,
        language: sub.language || 'en',
        name: sub.display || sub.language || 'English',
      }));
  } catch {
    return [];
  }
}

async function extractServer(server, mediaType, tmdbId, season, episode, debugLogs) {
  try {
    const typeParam = mediaType === 'tv' ? 'series' : 'movie';
    let targetUrl = `${API_GATEWAY_URL}/?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}&server=${encodeURIComponent(server)}`;
    if (mediaType === 'tv' && season && episode) {
      targetUrl += `&season=${season}&episode=${episode}`;
    }

    // 1. Sign request via helper API
    const encUrl = `${ENC_DEC_API_URL}/enc-cinejoy?url=${encodeURIComponent(targetUrl)}`;
    const encRes = await fetch(encUrl);
    if (!encRes.ok) {
      debugLogs.push(`[${server}] encRes ${encRes.status}`);
      return [];
    }

    const encJson = await encRes.json();
    if (encJson.status !== 200 || !encJson.result) {
      debugLogs.push(`[${server}] encJson error: ${encJson.error || 'bad status'}`);
      return [];
    }

    const { data, state } = encJson.result;
    const binaryPayload = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    debugLogs.push(`[${server}] payload size: ${binaryPayload.length} bytes`);

    // 2. Dispatch to binary gateway
    const gateRes = await fetch(`${API_GATEWAY_URL}/g`, {
      method: 'POST',
      headers: {
        ...CINEJOY_HEADERS,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryPayload,
    });
    if (!gateRes.ok) {
      const errText = await gateRes.text();
      debugLogs.push(`[${server}] gateRes ${gateRes.status} body: ${errText.slice(0, 100)}`);
      return [];
    }

    const gateArrayBuffer = await gateRes.arrayBuffer();
    const gateBuffer = Buffer.from(gateArrayBuffer);
    debugLogs.push(`[${server}] gateBytes size: ${gateBuffer.length} bytes`);

    // 3. Decrypt response
    const decRes = await fetch(`${ENC_DEC_API_URL}/dec-cinejoy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: gateBuffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        state,
      }),
    });
    if (!decRes.ok) {
      debugLogs.push(`[${server}] decRes status: ${decRes.status}`);
      return [];
    }

    const decJson = await decRes.json();
    if (decJson.status !== 200 || !decJson.result?.data?.stream) {
      debugLogs.push(`[${server}] decJson error: ${decJson.error || 'no stream'}`);
      return [];
    }

    const streamList = decJson.result.data.stream;
    const streams = [];
    for (const item of streamList) {
      const streamUrl = item.playlist || item.url;
      if (!streamUrl) continue;
      streams.push({
        name: 'Cinejoy',
        title: `Cinejoy [${server}] - 1080p (HLS)`,
        url: streamUrl,
        quality: '1080p',
        format: 'm3u8',
        provider: 'cinejoy',
        headers: {},
      });
    }

    debugLogs.push(`[${server}] found ${streams.length} streams`);
    return streams;
  } catch (err) {
    debugLogs.push(`[${server}] error: ${err.message}`);
    return [];
  }
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { tmdb, type = 'movie', season, episode, test, debug } = req.query;

  if (test === 'true') {
    try {
      const sResp = await fetch('https://api.shegu.st/servers', { headers: CINEJOY_HEADERS });
      const text = await sResp.text();
      return res.status(200).json({
        sheguStatus: sResp.status,
        sheguBody: text.slice(0, 200),
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (!tmdb) {
    return res.status(400).json({ error: 'Missing required query parameter "tmdb"' });
  }

  const debugLogs = [];

  try {
    const [subtitles, ...serverResults] = await Promise.all([
      fetchSubtitles(type, tmdb, season, episode),
      ...SERVERS.map(server => extractServer(server, type, tmdb, season, episode, debugLogs)),
    ]);

    const allStreams = [];
    for (const sList of serverResults) {
      for (const s of sList) {
        allStreams.push({
          ...s,
          subtitles,
        });
      }
    }

    return res.status(200).json({
      success: true,
      streams: allStreams,
      ...(debug === 'true' ? { debug: debugLogs } : {}),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      debug: debugLogs,
    });
  }
}

module.exports = handler;
module.exports.default = handler;
