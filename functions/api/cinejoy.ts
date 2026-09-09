/**
 * @fileoverview Cloudflare Pages Function / Edge API for Cinejoy streaming.
 * Handles the binary gateway handshake on the edge and exposes a clean JSON endpoint
 * for Nuvio's QuickJS runtime.
 */

const CINEJOY_ORIGIN = 'https://cinejoy.to';
const CINEJOY_REFERER = 'https://cinejoy.to/';
const API_GATEWAY_URL = 'https://api.shegu.st';
const SUBTITLES_API_URL = 'https://subtitles.shegu.st';
const ENC_DEC_API_URL = 'https://enc-dec.app/api';

const SERVERS = ['Lisbon', 'Nebula', 'Solara', 'Joy'];

const CINEJOY_HEADERS: Record<string, string> = {
  Accept: '*/*',
  Origin: CINEJOY_ORIGIN,
  Referer: CINEJOY_REFERER,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

function base64urlEncode(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    if (i + 1 < len) {
      result += B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)];
    }
    if (i + 2 < len) {
      result += B64_CHARS[b2 & 63];
    }
  }
  return result.replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const len = base64.length;
  let placeHolders = 0;
  if (base64[len - 1] === '=') placeHolders++;
  if (base64[len - 2] === '=') placeHolders++;

  const byteLen = (len * 3) / 4 - placeHolders;
  const bytes = new Uint8Array(byteLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded0 = B64_LOOKUP[base64.charCodeAt(i)];
    const encoded1 = B64_LOOKUP[base64.charCodeAt(i + 1)];
    const encoded2 = B64_LOOKUP[base64.charCodeAt(i + 2)];
    const encoded3 = B64_LOOKUP[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded0 << 2) | (encoded1 >> 4);
    if (p < byteLen) bytes[p++] = ((encoded1 & 15) << 4) | (encoded2 >> 2);
    if (p < byteLen) bytes[p++] = ((encoded2 & 3) << 6) | (encoded3 & 63);
  }
  return bytes;
}

interface Subtitle {
  url: string;
  language: string;
  name: string;
}

interface Stream {
  name: string;
  title: string;
  url: string;
  quality: string;
  format: string;
  headers: Record<string, string>;
  subtitles?: Subtitle[];
  provider?: string;
}

async function fetchSubtitles(
  mediaType: string,
  tmdbId: string,
  season: string | null,
  episode: string | null
): Promise<Subtitle[]> {
  try {
    const isTv = mediaType === 'tv' || mediaType === 'series';
    const typeParam = isTv ? 'series' : 'movie';
    let url = `${SUBTITLES_API_URL}/subtitles?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}`;
    if (isTv && season && episode) {
      url += `&season=${season}&episode=${episode}`;
    }

    const res = await fetch(url, { headers: CINEJOY_HEADERS });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      subtitles?: Array<{ language?: string; display?: string; url?: string }>;
    };
    if (!data?.subtitles || !Array.isArray(data.subtitles)) return [];

    return data.subtitles
      .filter(sub => sub.url && typeof sub.url === 'string')
      .map(sub => ({
        url: sub.url!,
        language: sub.language || 'en',
        name: sub.display || sub.language || 'English',
      }));
  } catch {
    return [];
  }
}

async function extractServer(
  server: string,
  mediaType: string,
  tmdbId: string,
  season: string | null,
  episode: string | null,
  debugLogs: string[]
): Promise<Stream[]> {
  try {
    const isTv = mediaType === 'tv' || mediaType === 'series';
    const typeParam = isTv ? 'series' : 'movie';
    let targetUrl = `${API_GATEWAY_URL}/?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}&server=${encodeURIComponent(server)}`;
    if (isTv && season && episode) {
      targetUrl += `&season=${season}&episode=${episode}`;
    }

    // 1. Sign request via helper API
    const encUrl = `${ENC_DEC_API_URL}/enc-cinejoy?url=${encodeURIComponent(targetUrl)}`;
    const encRes = await fetch(encUrl);
    debugLogs.push(`[${server}] encRes status: ${encRes.status}`);
    if (!encRes.ok) return [];

    const encJson = (await encRes.json()) as {
      status: number;
      result?: { data: string; state: Record<string, unknown> };
      error?: string;
    };
    if (encJson.status !== 200 || !encJson.result) {
      debugLogs.push(`[${server}] encJson error: ${encJson.error || 'bad status'}`);
      return [];
    }

    const { data, state } = encJson.result;
    const binaryPayload = base64urlDecode(data);
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
      debugLogs.push(`[${server}] gateRes ${gateRes.status} body: ${errText.slice(0, 150)}`);
      return [];
    }

    const gateArrayBuffer = await gateRes.arrayBuffer();
    const gateBytes = new Uint8Array(gateArrayBuffer);
    debugLogs.push(`[${server}] gateBytes size: ${gateBytes.length} bytes`);

    // 3. Decrypt response
    const decRes = await fetch(`${ENC_DEC_API_URL}/dec-cinejoy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: base64urlEncode(gateBytes),
        state,
      }),
    });
    debugLogs.push(`[${server}] decRes status: ${decRes.status}`);
    if (!decRes.ok) return [];

    const decJson = (await decRes.json()) as {
      status: number;
      result?: { data?: { stream?: Array<{ playlist?: string; url?: string }> } };
      error?: string;
    };
    if (decJson.status !== 200 || !decJson.result?.data?.stream) {
      debugLogs.push(`[${server}] decJson error: ${decJson.error || 'no stream'}`);
      return [];
    }

    const streamList = decJson.result.data.stream;
    const streams: Stream[] = [];
    for (const item of streamList) {
      const streamUrl = item.playlist || item.url;
      if (!streamUrl) continue;
      streams.push({
        name: 'Cinejoy',
        title: `Server [${server}] - 4K/1080p Auto (HLS)`,
        url: streamUrl,
        quality: '1080p',
        format: 'm3u8',
        provider: 'cinejoy',
        headers: CINEJOY_HEADERS,
      });
    }

    return streams;
  } catch (e) {
    const errStr = e instanceof Error ? e.message : String(e);
    debugLogs.push(`[${server}] exception: ${errStr}`);
    return [];
  }
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const tmdbId = url.searchParams.get('tmdb') || '';
  const mediaType = url.searchParams.get('type') || 'movie';
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');
  const debug = url.searchParams.get('debug') === 'true';

  if (!tmdbId) {
    return new Response(JSON.stringify({ error: 'Missing required query parameter "tmdb"' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const debugLogs: string[] = [];

  try {
    const [subtitles, ...serverResults] = await Promise.all([
      fetchSubtitles(mediaType, tmdbId, season, episode),
      ...SERVERS.map(server =>
        extractServer(server, mediaType, tmdbId, season, episode, debugLogs)
      ),
    ]);

    const allStreams: Stream[] = [];
    for (const res of serverResults) {
      for (const s of res) {
        allStreams.push({
          ...s,
          subtitles: subtitles.length > 0 ? subtitles : undefined,
        });
      }
    }

    const responsePayload: Record<string, unknown> = {
      success: true,
      streams: allStreams,
    };

    if (debug || allStreams.length === 0) {
      responsePayload.debug = debugLogs;
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message, streams: [], debug: debugLogs }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
