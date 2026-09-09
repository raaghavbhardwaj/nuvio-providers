import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'stream';

const CINEJOY_ORIGIN = 'https://cinejoy.to';
const CINEJOY_REFERER = 'https://cinejoy.to/';
const API_GATEWAY_URL = 'https://api.shegu.st';
const SUBTITLES_API_URL = 'https://subtitles.shegu.st';
const ENC_DEC_API_URL = 'https://enc-dec.app/api';

const SERVERS = ['Lisbon', 'Solara', 'Nebula', 'Joy'];

const CINEJOY_HEADERS: Record<string, string> = {
  Accept: '*/*',
  Origin: CINEJOY_ORIGIN,
  Referer: CINEJOY_REFERER,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
};

function getPlayerHeaders(): Record<string, string> {
  return {
    Accept: '*/*',
    Origin: CINEJOY_ORIGIN,
    Referer: CINEJOY_REFERER,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  };
}

async function fetchSubtitles(
  mediaType: string,
  tmdbId: string,
  season?: string,
  episode?: string
): Promise<any[]> {
  try {
    const isTv = mediaType === 'tv' || mediaType === 'series';
    const typeParam = isTv ? 'series' : 'movie';
    let url = `${SUBTITLES_API_URL}/subtitles?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}`;
    if (isTv && season && episode) {
      url += `&season=${season}&episode=${episode}`;
    }

    const res = await fetch(url, {
      headers: { ...CINEJOY_HEADERS },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as any;
    if (!data?.subtitles || !Array.isArray(data.subtitles)) return [];

    return data.subtitles
      .filter((sub: any) => sub.url && typeof sub.url === 'string')
      .map((sub: any) => ({
        url: sub.url,
        language: sub.language || 'en',
        name: sub.display || sub.language || 'English',
        headers: getPlayerHeaders(),
      }));
  } catch {
    return [];
  }
}

async function extractServer(
  server: string,
  mediaType: string,
  tmdbId: string,
  season: string | undefined,
  episode: string | undefined,
  debugLogs: string[]
): Promise<any[]> {
  try {
    const isTv = mediaType === 'tv' || mediaType === 'series';
    const typeParam = isTv ? 'series' : 'movie';
    let targetUrl = `${API_GATEWAY_URL}/?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}&server=${encodeURIComponent(server)}`;
    if (isTv && season && episode) {
      targetUrl += `&season=${season}&episode=${episode}`;
    }

    // 1. Sign request via helper API
    const encUrl = `${ENC_DEC_API_URL}/enc-cinejoy?url=${encodeURIComponent(targetUrl)}`;
    const encRes = await fetch(encUrl, { signal: AbortSignal.timeout(6000) });
    if (!encRes.ok) {
      debugLogs.push(`[${server}] encRes ${encRes.status}`);
      return [];
    }

    const encJson = (await encRes.json()) as any;
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
      signal: AbortSignal.timeout(6000),
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
        text: gateBuffer
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, ''),
        state,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!decRes.ok) {
      debugLogs.push(`[${server}] decRes status: ${decRes.status}`);
      return [];
    }

    const decJson = (await decRes.json()) as any;
    if (decJson.status !== 200 || !decJson.result?.data?.stream) {
      debugLogs.push(`[${server}] decJson error: ${decJson.error || 'no stream'}`);
      return [];
    }

    const streamList = decJson.result.data.stream;
    const streams: any[] = [];
    for (const item of streamList) {
      const streamUrl = item.playlist || item.url;
      if (!streamUrl) continue;
      const is4K = server === 'Lisbon';
      streams.push({
        name: 'Cinejoy',
        title: `Cinejoy [${server}] - ${is4K ? '4K/1080p' : '1080p'} (HLS)`,
        url: streamUrl,
        quality: is4K ? '4K' : '1080p',
        format: 'm3u8',
        provider: 'cinejoy',
        headers: getPlayerHeaders(),
      });
    }

    debugLogs.push(`[${server}] found ${streams.length} streams`);
    return streams;
  } catch (err: any) {
    debugLogs.push(`[${server}] error: ${err.message}`);
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- HLS Stream & Segment Proxy ---
  if (req.query.hls === '1' && typeof req.query.url === 'string') {
    const targetUrl = req.query.url;
    try {
      const upstreamHeaders: Record<string, string> = {
        Accept: '*/*',
        Origin: CINEJOY_ORIGIN,
        Referer: CINEJOY_REFERER,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      };
      if (req.headers['range']) {
        upstreamHeaders['Range'] = Array.isArray(req.headers['range'])
          ? req.headers['range'][0]
          : req.headers['range'];
      }

      const upstreamRes = await fetch(targetUrl, {
        headers: upstreamHeaders,
        signal: AbortSignal.timeout(15000),
      });

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        return res.status(upstreamRes.status).send(`Upstream error: ${upstreamRes.status}`);
      }

      const upstreamContentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
      const extParam = (req.query.ext as string) || '';
      const isSegmentExt = extParam === '.m4s' || extParam === '.ts' || extParam === '.mp4';
      const isM3U8 =
        !isSegmentExt &&
        (targetUrl.includes('.m3u8') ||
          targetUrl.includes('playlist') ||
          upstreamContentType.includes('mpegurl') ||
          upstreamContentType.includes('application/x-mpegurl'));

      if (isM3U8) {
        const text = await upstreamRes.text();
        const forwardedHost = req.headers['x-forwarded-host'];
        const host = Array.isArray(forwardedHost)
          ? forwardedHost[0]
          : forwardedHost || req.headers.host || 'nuvio-providers-rose.vercel.app';

        const forwardedProto = req.headers['x-forwarded-proto'];
        const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'https';
        const proxyBase = `${proto}://${host}/api/cinejoy?hls=1&url=`;

        const lines = text.split('\n');
        let isSegment = false;
        const rewrittenLines: string[] = [];

        for (let rawLine of lines) {
          const trimmed = rawLine.trim();
          if (!trimmed) {
            rewrittenLines.push(rawLine);
            continue;
          }

          // Handle #EXT-X-MAP:URI="..."
          if (trimmed.startsWith('#EXT-X-MAP:')) {
            rewrittenLines.push(
              trimmed.replace(/URI="([^"]+)"/, (_match: string, uri: string) => {
                const absUri = new URL(uri, targetUrl).toString();
                return `URI="${proxyBase}${encodeURIComponent(absUri)}&ext=.mp4"`;
              })
            );
            continue;
          }

          // Handle #EXT-X-MEDIA:...URI="..."
          if (trimmed.startsWith('#EXT-X-MEDIA:')) {
            rewrittenLines.push(
              trimmed.replace(/URI="([^"]+)"/, (_match: string, uri: string) => {
                const absUri = new URL(uri, targetUrl).toString();
                return `URI="${proxyBase}${encodeURIComponent(absUri)}"`;
              })
            );
            continue;
          }

          if (trimmed.startsWith('#EXTINF:')) {
            isSegment = true;
            rewrittenLines.push(trimmed);
            continue;
          }

          // Keep all other tags intact (including #EXT-X-STREAM-INF, do not strip variants!)
          if (trimmed.startsWith('#')) {
            rewrittenLines.push(trimmed);
            continue;
          }

          // Target URI: either a sub-playlist or a media segment
          const absUrl = new URL(trimmed, targetUrl).toString();
          if (isSegment) {
            isSegment = false;
            const isFmp4 =
              absUrl.includes('movieboxnoob.cc/video') ||
              absUrl.includes('movieboxnoob.cc/hls') ||
              absUrl.includes('bright67.online');
            const segExt = isFmp4 ? '.m4s' : '.ts';
            rewrittenLines.push(`${proxyBase}${encodeURIComponent(absUrl)}&ext=${segExt}`);
          } else {
            // Variant sub-playlist (e.g. video_1080p.m3u8, 1080p/playlist.jpg)
            rewrittenLines.push(`${proxyBase}${encodeURIComponent(absUrl)}`);
          }
        }

        const rewritten = rewrittenLines.join('\n');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(rewritten);
      }

      // Video segment (chunk) streaming
      let contentType = 'video/mp2t';
      if (
        req.query.ext === '.m4s' ||
        req.query.ext === '.mp4' ||
        targetUrl.includes('init') ||
        targetUrl.includes('.mp4') ||
        targetUrl.includes('video_') ||
        targetUrl.includes('.h265')
      ) {
        contentType = 'video/mp4';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range, *');
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Length, Content-Range, Accept-Ranges'
      );

      if (upstreamRes.headers.has('content-length')) {
        res.setHeader('Content-Length', upstreamRes.headers.get('content-length') as string);
      }
      if (upstreamRes.headers.has('content-range')) {
        res.setHeader('Content-Range', upstreamRes.headers.get('content-range') as string);
      }
      if (upstreamRes.headers.has('accept-ranges')) {
        res.setHeader('Accept-Ranges', upstreamRes.headers.get('accept-ranges') as string);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

      if (req.method === 'HEAD') {
        return res.status(upstreamRes.status).end();
      }

      res.status(upstreamRes.status);
      if (upstreamRes.body) {
        return Readable.fromWeb(upstreamRes.body as any).pipe(res as any);
      } else {
        return res.status(500).send('No upstream body');
      }
    } catch (e: any) {
      return res.status(502).send(`Proxy error: ${e.message}`);
    }
  }

  const { tmdb, type = 'movie', season, episode, test, debug } = req.query;

  if (test === 'true') {
    try {
      const sResp = await fetch('https://api.shegu.st/servers', {
        headers: { ...CINEJOY_HEADERS },
      });
      const text = await sResp.text();
      return res.status(200).json({
        sheguStatus: sResp.status,
        sheguBody: text.slice(0, 200),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (!tmdb) {
    return res.status(400).json({ error: 'Missing required query parameter "tmdb"' });
  }

  const tmdbStr = Array.isArray(tmdb) ? tmdb[0] : tmdb;
  const typeStr = Array.isArray(type) ? type[0] : type;
  const seasonStr = Array.isArray(season) ? season[0] : season;
  const episodeStr = Array.isArray(episode) ? episode[0] : episode;

  const debugLogs: string[] = [];

  try {
    const [subtitles, ...serverResults] = await Promise.all([
      fetchSubtitles(typeStr, tmdbStr, seasonStr, episodeStr),
      ...SERVERS.map(server =>
        extractServer(server, typeStr, tmdbStr, seasonStr, episodeStr, debugLogs)
      ),
    ]);

    const allStreams: any[] = [];
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : forwardedHost || req.headers.host || 'nuvio-providers-rose.vercel.app';

    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'https';

    // 1. Primary: Fast Edge-Proxied Streams
    for (const sList of serverResults) {
      for (const s of sList) {
        const is4K = s.quality === '4K';
        const serverMatch = s.title.match(/\[(.*?)\]/);
        const serverName = serverMatch ? serverMatch[1] : 'Server';
        const proxyUrl = `${proto}://${host}/api/cinejoy?hls=1&url=${encodeURIComponent(s.url)}`;

        allStreams.push({
          name: 'Cinejoy',
          title: `Cinejoy [${serverName}] - ${is4K ? '4K/1080p' : '1080p'} [Proxy]`,
          url: proxyUrl,
          quality: s.quality,
          format: 'm3u8',
          provider: 'cinejoy',
          headers: getPlayerHeaders(),
          subtitles,
        });
      }
    }

    return res.status(200).json({
      success: true,
      streams: allStreams,
      ...(debug === 'true' ? { debug: debugLogs } : {}),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      debug: debugLogs,
    });
  }
}
