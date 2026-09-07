/**
 * @fileoverview Stream extraction and decryptor logic for Cinejoy.
 */

import type { MediaType, Stream } from '../../types/nuvio';
import { API_GATEWAY_URL, CINEJOY_HEADERS, ENC_DEC_API_URL, type CinejoyServer } from './constants';
import { base64urlDecode, base64urlEncode } from './utils';

interface EncDecEncryptResponse {
  status: number;
  result?: {
    data: string;
    state: Record<string, unknown>;
  };
  error?: string;
}

interface DecryptedStream {
  type?: string;
  id?: string;
  playlist?: string;
  url?: string;
}

interface EncDecDecryptResponse {
  status: number;
  result?: {
    data?: {
      stream?: DecryptedStream[];
    };
  };
  error?: string;
}

/**
 * Extracts playable video streams from a specific Cinejoy backend server.
 *
 * @param server Server name (e.g., 'Lisbon', 'Nebula', 'Solara').
 * @param mediaType Movie or series.
 * @param tmdbId TMDB identifier.
 * @param season Optional season number.
 * @param episode Optional episode number.
 * @returns Array of stream objects found from this server.
 */
export async function extractServerStream(
  server: CinejoyServer,
  mediaType: MediaType,
  tmdbId: string,
  season: number | null,
  episode: number | null
): Promise<Stream[]> {
  try {
    const typeParam = mediaType === 'tv' ? 'series' : 'movie';
    let targetUrl = `${API_GATEWAY_URL}/?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}&server=${encodeURIComponent(server)}`;
    if (mediaType === 'tv' && season && episode) {
      targetUrl += `&season=${season}&episode=${episode}`;
    }

    // 1. Sign and encrypt request via API gateway helper
    const encUrl = `${ENC_DEC_API_URL}/enc-cinejoy?url=${encodeURIComponent(targetUrl)}`;
    const encController = new AbortController();
    const encTimeout = setTimeout(() => encController.abort(), 6000);

    const encResponse = await fetch(encUrl, {
      signal: encController.signal,
    });
    clearTimeout(encTimeout);

    if (!encResponse.ok) return [];
    const encJson = (await encResponse.json()) as EncDecEncryptResponse;
    if (encJson.status !== 200 || !encJson.result) return [];

    const { data, state } = encJson.result;
    const binaryPayload = base64urlDecode(data);

    // 2. Dispatch encrypted payload to Cinejoy's binary gateway
    const gateController = new AbortController();
    const gateTimeout = setTimeout(() => gateController.abort(), 6000);

    const gateResponse = await fetch(`${API_GATEWAY_URL}/g`, {
      method: 'POST',
      headers: {
        ...CINEJOY_HEADERS,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryPayload.buffer as ArrayBuffer,
      signal: gateController.signal,
    });
    clearTimeout(gateTimeout);

    if (!gateResponse.ok) return [];
    const gateArrayBuffer = await gateResponse.arrayBuffer();
    const gateBytes = new Uint8Array(gateArrayBuffer);

    // 3. Decrypt response payload
    const decController = new AbortController();
    const decTimeout = setTimeout(() => decController.abort(), 6000);

    const decResponse = await fetch(`${ENC_DEC_API_URL}/dec-cinejoy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: base64urlEncode(gateBytes),
        state,
      }),
      signal: decController.signal,
    });
    clearTimeout(decTimeout);

    if (!decResponse.ok) return [];
    const decJson = (await decResponse.json()) as EncDecDecryptResponse;
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
        headers: CINEJOY_HEADERS,
      });
    }

    return streams;
  } catch {
    return [];
  }
}
