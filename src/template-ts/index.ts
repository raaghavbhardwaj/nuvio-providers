import type { GetStreams, Stream } from '../../types/nuvio';
import { createHeaders } from '../common/headers';

/**
 * Example TypeScript Provider for Nuvio
 */
export const getStreams: GetStreams = async (tmdbId, mediaType, season, episode): Promise<Stream[]> => {
  const headers = createHeaders('https://example.com');

  console.log(`[TemplateTS] Searching for TMDB ID: ${tmdbId}, Type: ${mediaType}`);

  // Example stream result
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
          name: 'English'
        }
      ]
    }
  ];

  return streams;
};
