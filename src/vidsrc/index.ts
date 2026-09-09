/**
 * @fileoverview VidSrc provider for Nuvio.
 * Resolves high-speed adaptive HLS streams (up to 4K UHD) with subtitles.
 */

import type { GetStreams, MediaType, Quality, Stream, Subtitle } from '../../types/nuvio';
import { API_BASE, DEC_API_URL, SERVERS, SUBTITLES_API_URL, VIDSRC_HEADERS } from './constants';

const VIDSRC_EDGE_API = 'https://nuvio-providers-rose.vercel.app/api/vidsrc';

interface TmdbResponse {
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  imdb_id?: string;
  external_ids?: {
    imdb_id?: string;
  };
}

interface SeedResponse {
  seed: string;
}

interface DecryptedSource {
  quality: string;
  url: string;
}

interface DecryptedResult {
  sources?: DecryptedSource[];
  playlist?: string;
}

interface DecryptedResponse {
  status: number;
  result?: DecryptedResult;
}

const QUALITY_ORDER: Record<string, number> = {
  '4K': 5,
  '2160p': 5,
  '1440p': 4,
  '1080p': 3,
  '720p': 2,
  '480p': 1,
  '360p': 0,
  Auto: -1,
  Unknown: -2,
};

function normalizeQuality(q: string): Quality {
  const clean = q.trim();
  if (/^(4k|2160p)$/i.test(clean)) return '4K';
  if (/^1080p$/i.test(clean)) return '1080p';
  if (/^720p$/i.test(clean)) return '720p';
  if (/^480p$/i.test(clean)) return '480p';
  if (/^360p$/i.test(clean)) return '360p';
  return clean || '1080p';
}

async function fetchSubtitles(
  mediaType: MediaType,
  tmdbId: string,
  season: number | null,
  episode: number | null
): Promise<Subtitle[]> {
  try {
    let url = `${SUBTITLES_API_URL}?type=${mediaType}&tmdb=${encodeURIComponent(tmdbId)}`;
    if (mediaType === 'tv' && season && episode) {
      url += `&season=${season}&episode=${episode}`;
    }

    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const list = Array.isArray(json) ? json : Array.isArray(json?.subtitles) ? json.subtitles : [];

    return list
      .filter((item: any) => item?.url)
      .map((item: any) => ({
        url: item.url,
        language: item.language || 'en',
        name: item.display || item.language || 'Subtitle',
      }));
  } catch {
    return [];
  }
}

async function fetchServerStreams(
  serverId: string,
  serverLabel: string,
  mediaType: MediaType,
  tmdbId: string,
  title: string,
  year: string,
  imdbId: string,
  seed: string,
  season: number | null,
  episode: number | null,
  subtitles: Subtitle[]
): Promise<Stream[]> {
  try {
    const encTitle = encodeURIComponent(encodeURIComponent(title));
    const enc = '2';

    let targetUrl = `${API_BASE}/${serverId}/sources-with-title?title=${encTitle}&mediaType=${mediaType}&year=${year}&tmdbId=${tmdbId}&imdbId=${imdbId}&enc=${enc}&seed=${seed}`;
    if (mediaType === 'tv' && season && episode) {
      targetUrl = `${API_BASE}/${serverId}/sources-with-title?title=${encTitle}&mediaType=tv&year=${year}&episodeId=${episode}&seasonId=${season}&tmdbId=${tmdbId}&imdbId=${imdbId}&enc=${enc}&seed=${seed}`;
    }

    const encRes = await fetch(targetUrl, { headers: VIDSRC_HEADERS });
    const encText = await encRes.text();

    if (!encText || encText.includes('error') || encText.includes('bad')) {
      return [];
    }

    const decRes = await fetch(DEC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: encText, id: tmdbId, seed }),
    });

    if (!decRes.ok) return [];
    const decData = (await decRes.json()) as DecryptedResponse;

    if (decData.status !== 200 || !decData.result) return [];

    const streams: Stream[] = [];
    const result = decData.result;

    if (result.playlist) {
      streams.push({
        name: serverLabel,
        title: `${serverLabel} - Master (Auto HLS)`,
        url: result.playlist,
        quality: '1080p',
        format: 'm3u8',
        subtitles,
      });
    }

    if (result.sources && Array.isArray(result.sources)) {
      for (const src of result.sources) {
        if (!src.url) continue;
        const normQ = normalizeQuality(src.quality);
        streams.push({
          name: serverLabel,
          title: `${serverLabel} - ${normQ}`,
          url: src.url,
          quality: normQ,
          format: 'm3u8',
          subtitles,
        });
      }
    }

    return streams;
  } catch {
    return [];
  }
}

export const getStreams: GetStreams = async (
  tmdbId: string,
  mediaType: MediaType,
  season: number | null,
  episode: number | null
): Promise<Stream[]> => {
  try {
    console.log(
      `[VidSrc] Resolving streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? ` S${season}E${episode}` : ''}`
    );

    // 1. Try Vercel Edge API first (clean JSON, 100% QuickJS and mobile native compatible)
    try {
      const typeParam = mediaType === 'tv' ? 'series' : 'movie';
      let edgeUrl = `${VIDSRC_EDGE_API}?tmdb=${encodeURIComponent(tmdbId)}&type=${typeParam}`;
      if (mediaType === 'tv' && season && episode) {
        edgeUrl += `&season=${season}&episode=${episode}`;
      }

      const edgeRes = await fetch(edgeUrl);
      if (edgeRes.ok) {
        const edgeData = (await edgeRes.json()) as { success?: boolean; streams?: Stream[] };
        if (edgeData?.streams && Array.isArray(edgeData.streams) && edgeData.streams.length > 0) {
          console.log(`[VidSrc] Resolved ${edgeData.streams.length} stream(s) via Edge API.`);
          return edgeData.streams;
        }
      }
    } catch {
      // Fallback to direct extraction
    }

    // 2. Fetch TMDB details
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49&append_to_response=external_ids`;
    const tmdbRes = await fetch(tmdbUrl);
    if (!tmdbRes.ok) return [];
    const tmdbData = (await tmdbRes.json()) as TmdbResponse;

    const title = (mediaType === 'tv' ? tmdbData.name : tmdbData.title) || '';
    const dateStr = (mediaType === 'tv' ? tmdbData.first_air_date : tmdbData.release_date) || '';
    const year = dateStr.slice(0, 4) || '2023';
    const imdbId = tmdbData.imdb_id || tmdbData.external_ids?.imdb_id || '';

    if (!title) return [];

    // 3. Fetch seed & subtitles in parallel
    const [seedRes, subtitles] = await Promise.all([
      fetch(`${API_BASE}/seed?mediaId=${tmdbId}`, { headers: VIDSRC_HEADERS }),
      fetchSubtitles(mediaType, tmdbId, season, episode),
    ]);

    if (!seedRes.ok) return [];
    const seedData = (await seedRes.json()) as SeedResponse;
    const seed = seedData?.seed;
    if (!seed) return [];

    // 4. Query all servers in parallel
    const serverResults = await Promise.all(
      SERVERS.map(srv =>
        fetchServerStreams(
          srv.id,
          srv.name,
          mediaType,
          tmdbId,
          title,
          year,
          imdbId,
          seed,
          season,
          episode,
          subtitles
        )
      )
    );

    const allStreams = serverResults.flat();

    // Sort streams by quality descending
    allStreams.sort((a, b) => {
      const qA = QUALITY_ORDER[a.quality || 'Unknown'] || -2;
      const qB = QUALITY_ORDER[b.quality || 'Unknown'] || -2;
      return qB - qA;
    });

    console.log(`[VidSrc] Successfully resolved ${allStreams.length} stream(s).`);
    return allStreams;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[VidSrc] Extraction error: ${message}`);
    return [];
  }
};
