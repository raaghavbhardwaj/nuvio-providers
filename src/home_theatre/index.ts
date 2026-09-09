/**
 * @fileoverview Home_Theatre provider for Nuvio.
 * Routes through the personal Cloudflare Edge API platform (home-theatre.fancied.workers.dev)
 * to stream high-bitrate 4K/1080p HLS feeds with synchronized multi-language subtitles.
 */

import type { GetStreams, MediaType, Stream } from '../../types/nuvio';

const CLOUDFLARE_EDGE_API = 'https://home-theatre.fancied.workers.dev/api/streams';

export const getStreams: GetStreams = async (
  tmdbId: string,
  mediaType: MediaType,
  season: number | null,
  episode: number | null
): Promise<Stream[]> => {
  try {
    const isTv =
      mediaType === 'tv' ||
      mediaType === ('series' as any) ||
      (typeof season === 'number' && season > 0) ||
      (typeof season === 'string' && season !== '');

    const typeParam = isTv ? 'tv' : 'movie';
    let url = `${CLOUDFLARE_EDGE_API}?tmdb=${encodeURIComponent(tmdbId)}&type=${typeParam}`;

    if (isTv) {
      const s = season != null ? String(season) : '1';
      const e = episode != null ? String(episode) : '1';
      url += `&s=${s}&e=${e}`;
    }

    console.log(`[Home_Theatre] Fetching edge streams from: ${url}`);

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Home_Theatre] Edge API returned HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { success?: boolean; streams?: Stream[] };
    if (!data?.streams || !Array.isArray(data.streams)) {
      return [];
    }

    console.log(`[Home_Theatre] Successfully resolved ${data.streams.length} stream(s) via Cloudflare Edge.`);
    return data.streams;
  } catch (error: any) {
    console.error(`[Home_Theatre] Error fetching streams: ${error?.message || error}`);
    return [];
  }
};
