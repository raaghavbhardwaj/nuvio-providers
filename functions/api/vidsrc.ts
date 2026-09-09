/**
 * @fileoverview Cloudflare Pages Function / Edge API for VidSrc streaming.
 * Handles the upstream API decryption on Cloudflare Edge with custom Referer headers
 * and returns clean JSON for Nuvio mobile client.
 */

const VIDSRC_HEADERS: Record<string, string> = {
  Accept: '*/*',
  Origin: 'https://player.videasy.to',
  Referer: 'https://player.videasy.to/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const API_BASE = 'https://api.speedracelight.com';
const DEC_API_URL = 'https://enc-dec.app/api/dec-videasy';
const SUBTITLES_API_URL = 'https://subtitles.shegu.st/subtitles';

const SERVERS = [
  { id: 'cdn', name: 'VidSrc [Yoru]' },
  { id: 'm4uhd', name: 'VidSrc [Breach]' },
] as const;

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

function normalizeQuality(q: string): string {
  const clean = q.trim();
  if (/^(4k|2160p)$/i.test(clean)) return '4K';
  if (/^1080p$/i.test(clean)) return '1080p';
  if (/^720p$/i.test(clean)) return '720p';
  if (/^480p$/i.test(clean)) return '480p';
  if (/^360p$/i.test(clean)) return '360p';
  return clean || '1080p';
}

async function fetchSubtitles(
  mediaType: string,
  tmdbId: string,
  season: string | null,
  episode: string | null
): Promise<any[]> {
  try {
    const typeParam = mediaType === 'tv' || mediaType === 'series' ? 'series' : 'movie';
    let url = `${SUBTITLES_API_URL}?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}`;
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
  mediaType: string,
  tmdbId: string,
  title: string,
  year: string,
  imdbId: string,
  seed: string,
  season: string | null,
  episode: string | null,
  subtitles: any[] = []
): Promise<any[]> {
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
    const decData = (await decRes.json()) as any;

    if (decData.status !== 200 || !decData.result) return [];

    const streams: any[] = [];
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

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const tmdbId = url.searchParams.get('tmdb') || '';
  const typeParam = url.searchParams.get('type') || 'movie';
  const mediaType = typeParam === 'tv' || typeParam === 'series' ? 'tv' : 'movie';
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');

  if (!tmdbId) {
    return new Response(JSON.stringify({ error: 'Missing required query parameter "tmdb"' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  try {
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49&append_to_response=external_ids`;
    const tmdbRes = await fetch(tmdbUrl);
    if (!tmdbRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch TMDB metadata' }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
    const tmdbData = (await tmdbRes.json()) as any;

    const title = (mediaType === 'tv' ? tmdbData.name : tmdbData.title) || '';
    const dateStr = (mediaType === 'tv' ? tmdbData.first_air_date : tmdbData.release_date) || '';
    const year = dateStr.slice(0, 4) || '2023';
    const imdbId = tmdbData.imdb_id || tmdbData.external_ids?.imdb_id || '';

    if (!title) {
      return new Response(JSON.stringify({ error: 'Title not found on TMDB' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const [seedRes, subtitles] = await Promise.all([
      fetch(`${API_BASE}/seed?mediaId=${tmdbId}`, { headers: VIDSRC_HEADERS }),
      fetchSubtitles(mediaType, tmdbId, season, episode),
    ]);

    if (!seedRes.ok) {
      const errBody = await seedRes.text();
      return new Response(JSON.stringify({ error: 'Failed to fetch seed', status: seedRes.status, body: errBody }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
    const seedData = (await seedRes.json()) as any;
    const seed = seedData?.seed;

    if (!seed) {
      return new Response(JSON.stringify({ error: 'Empty seed returned' }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }

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

    allStreams.sort((a, b) => {
      const qA = QUALITY_ORDER[a.quality || 'Unknown'] || -2;
      const qB = QUALITY_ORDER[b.quality || 'Unknown'] || -2;
      return qB - qA;
    });

    return new Response(
      JSON.stringify({
        success: true,
        streams: allStreams,
      }),
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, streams: [] }), {
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
