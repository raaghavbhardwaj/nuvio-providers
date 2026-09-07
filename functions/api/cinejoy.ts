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

function base64urlEncode(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
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
    const typeParam = mediaType === 'tv' ? 'series' : 'movie';
    let url = `${SUBTITLES_API_URL}/subtitles?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}`;
    if (mediaType === 'tv' && season && episode) {
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
  episode: string | null
): Promise<Stream[]> {
  try {
    const typeParam = mediaType === 'tv' ? 'series' : 'movie';
    let targetUrl = `${API_GATEWAY_URL}/?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}&server=${encodeURIComponent(server)}`;
    if (mediaType === 'tv' && season && episode) {
      targetUrl += `&season=${season}&episode=${episode}`;
    }

    // 1. Sign request via helper API
    const encUrl = `${ENC_DEC_API_URL}/enc-cinejoy?url=${encodeURIComponent(targetUrl)}`;
    const encRes = await fetch(encUrl);
    if (!encRes.ok) return [];

    const encJson = (await encRes.json()) as {
      status: number;
      result?: { data: string; state: Record<string, unknown> };
    };
    if (encJson.status !== 200 || !encJson.result) return [];

    const { data, state } = encJson.result;
    const binaryPayload = base64urlDecode(data);

    // 2. Dispatch to binary gateway
    const gateRes = await fetch(`${API_GATEWAY_URL}/g`, {
      method: 'POST',
      headers: {
        ...CINEJOY_HEADERS,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryPayload.buffer,
    });
    if (!gateRes.ok) return [];

    const gateArrayBuffer = await gateRes.arrayBuffer();
    const gateBytes = new Uint8Array(gateArrayBuffer);

    // 3. Decrypt response
    const decRes = await fetch(`${ENC_DEC_API_URL}/dec-cinejoy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: base64urlEncode(gateBytes),
        state,
      }),
    });
    if (!decRes.ok) return [];

    const decJson = (await decRes.json()) as {
      status: number;
      result?: { data?: { stream?: Array<{ playlist?: string; url?: string }> } };
    };
    const streamList = decJson?.result?.data?.stream || [];

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
  } catch {
    return [];
  }
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const tmdbId = url.searchParams.get('tmdb') || '';
  const mediaType = url.searchParams.get('type') || 'movie';
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');

  if (!tmdbId) {
    return new Response(JSON.stringify({ error: 'Missing required query parameter "tmdb"' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  try {
    const [subtitles, ...serverResults] = await Promise.all([
      fetchSubtitles(mediaType, tmdbId, season, episode),
      ...SERVERS.map(server => extractServer(server, mediaType, tmdbId, season, episode)),
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

    return new Response(JSON.stringify({ success: true, streams: allStreams }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message, streams: [] }), {
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
