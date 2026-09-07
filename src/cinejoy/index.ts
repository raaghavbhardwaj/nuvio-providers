/**
 * @fileoverview Cinejoy provider for Nuvio.
 * Fetches high-quality adaptive HLS streams (up to 4K HDR) with multi-server fallback
 * and subtitles from Cinejoy.to.
 */

import type { GetStreams, Stream } from '../../types/nuvio';
import { CINEJOY_EDGE_API, SERVERS } from './constants';
import { extractServerStream } from './extractor';
import { fetchCinejoySubtitles } from './utils';

/**
 * Main stream resolver function for Cinejoy.
 *
 * @param tmdbId TMDB ID string.
 * @param mediaType Media type ('movie' or 'tv').
 * @param season Season number (for TV shows).
 * @param episode Episode number (for TV shows).
 * @returns Array of playable Stream objects.
 */
export const getStreams: GetStreams = async (
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season: number | null,
  episode: number | null
): Promise<Stream[]> => {
  try {
    console.log(
      `[Cinejoy] Resolving streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? ` S${season}E${episode}` : ''}`
    );

    // 1. Try Cloudflare Edge API first (clean JSON, 100% QuickJS compatible)
    try {
      const typeParam = mediaType === 'tv' ? 'series' : 'movie';
      let edgeUrl = `${CINEJOY_EDGE_API}?tmdb=${encodeURIComponent(tmdbId)}&type=${typeParam}`;
      if (mediaType === 'tv' && season && episode) {
        edgeUrl += `&season=${season}&episode=${episode}`;
      }

      const edgeRes = await fetch(edgeUrl);
      if (edgeRes.ok) {
        const edgeData = (await edgeRes.json()) as { success?: boolean; streams?: Stream[] };
        if (edgeData?.streams && Array.isArray(edgeData.streams) && edgeData.streams.length > 0) {
          console.log(`[Cinejoy] Resolved ${edgeData.streams.length} stream(s) via Edge API.`);
          return edgeData.streams;
        }
      }
    } catch {
      // Fallback to local extraction if edge API is unreachable
    }

    // 2. Concurrently fetch streams from top servers and subtitles
    const [subtitles, ...serverResults] = await Promise.all([
      fetchCinejoySubtitles(mediaType, tmdbId, season, episode),
      ...SERVERS.map(server => extractServerStream(server, mediaType, tmdbId, season, episode)),
    ]);

    const allStreams: Stream[] = [];

    for (const res of serverResults) {
      if (Array.isArray(res) && res.length > 0) {
        for (const s of res) {
          allStreams.push({
            ...s,
            subtitles: subtitles.length > 0 ? subtitles : undefined,
          });
        }
      }
    }

    console.log(`[Cinejoy] Successfully resolved ${allStreams.length} stream(s).`);
    return allStreams;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Cinejoy] Extraction error: ${message}`);
    return [];
  }
};
