/**
 * @fileoverview Utility helpers for Cinejoy encoding and subtitle extraction.
 */

import type { MediaType, Subtitle } from '../../types/nuvio';
import { CINEJOY_HEADERS, SUBTITLES_API_URL } from './constants';

/**
 * Pure JavaScript Base64URL encoder (Hermes and React Native compatible).
 *
 * @param uint8Array Raw byte array.
 * @returns URL-safe Base64 string without padding.
 */
export function base64urlEncode(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 =
    typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Pure JavaScript Base64URL decoder (Hermes and React Native compatible).
 *
 * @param base64url URL-safe Base64 string.
 * @returns Decoded Uint8Array byte buffer.
 */
export function base64urlDecode(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary =
    typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
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
