/**
 * @fileoverview Cinejoy provider for Nuvio.
 * Fetches high-quality adaptive HLS streams (up to 4K HDR) with multi-server fallback
 * and subtitles from Cinejoy.to.
 */

import type { GetStreams, Stream } from '../../types/nuvio';
import { SERVERS } from './constants';
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

    // Concurrently fetch streams from top servers and subtitles
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
