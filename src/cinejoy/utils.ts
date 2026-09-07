/**
 * @fileoverview Utility helpers for Cinejoy encoding and subtitle extraction.
 */

import type { MediaType, Subtitle } from '../../types/nuvio';
import { CINEJOY_HEADERS, SUBTITLES_API_URL } from './constants';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

/**
 * Pure JavaScript Base64URL encoder (QuickJS and Hermes compatible).
 *
 * @param bytes Raw byte array.
 * @returns URL-safe Base64 string without padding.
 */
export function base64urlEncode(bytes: Uint8Array): string {
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

/**
 * Pure JavaScript Base64URL decoder (QuickJS and Hermes compatible).
 *
 * @param base64url URL-safe Base64 string.
 * @returns Decoded Uint8Array byte buffer.
 */
export function base64urlDecode(base64url: string): Uint8Array {
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

interface RawSubtitle {
  id?: string;
  language?: string;
  url?: string;
  type?: string;
  display?: string;
}

interface SubtitleApiResponse {
  subtitles?: RawSubtitle[];
}

/**
 * Fetches subtitles available on Cinejoy for a given media title.
 *
 * @param mediaType Movie or TV.
 * @param tmdbId TMDB ID.
 * @param season Season number for TV.
 * @param episode Episode number for TV.
 * @returns Array of formatted Nuvio Subtitles.
 */
export async function fetchCinejoySubtitles(
  mediaType: MediaType,
  tmdbId: string,
  season: number | null,
  episode: number | null
): Promise<Subtitle[]> {
  try {
    let url = `${SUBTITLES_API_URL}/subtitles?type=${mediaType}&tmdb=${encodeURIComponent(tmdbId)}`;
    if (mediaType === 'tv' && season && episode) {
      url += `&season=${season}&episode=${episode}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, {
      headers: CINEJOY_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return [];
    const json = (await response.json()) as RawSubtitle[] | SubtitleApiResponse;
    const list: RawSubtitle[] = Array.isArray(json)
      ? json
      : Array.isArray(json.subtitles)
        ? json.subtitles
        : [];

    return list
      .filter(item => item.url)
      .map(item => ({
        url: item.url as string,
        language: item.language || 'en',
        name: item.display || item.language || 'Subtitle',
      }));
  } catch {
    return [];
  }
}
