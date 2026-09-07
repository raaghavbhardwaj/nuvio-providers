/**
 * @fileoverview Example TypeScript reference provider implementation for Nuvio.
 * Demonstrates standard typing, error resilience, and Hermes-compliant bundling.
 */

import type { GetStreams, Stream } from '../../types/nuvio';
import { createHeaders, USER_AGENTS } from '../common/headers';

/**
 * Resolves media streams for a movie or TV show.
 *
 * @param tmdbId TMDB ID for the requested media item.
 * @param mediaType Content type ('movie' or 'tv').
 * @param season Season number (1-indexed for TV shows, null for movies).
 * @param episode Episode number (1-indexed for TV shows, null for movies).
 * @returns An array of stream objects playable by Nuvio.
 */
export const getStreams: GetStreams = async (
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season: number | null,
  episode: number | null
): Promise<Stream[]> => {
  const headers = createHeaders('https://example.com', USER_AGENTS.DESKTOP);

  console.log(`[TemplateTS] Resolving streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);

  const streams: Stream[] = [
    {
      name: 'TemplateTS',
      title: 'Server 1 - 1080p [Fast]',
      url: `https://example.com/streams/${tmdbId}.m3u8`,
      quality: '1080p',
      format: 'm3u8',
      headers,
      subtitles: [
        {
          url: `https://example.com/subs/${tmdbId}_en.vtt`,
          language: 'en',
          name: 'English',
        },
      ],
    },
  ];

  return streams;
};
