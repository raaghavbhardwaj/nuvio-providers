const TMDB_API_KEY = '68e094699525b18a70bab2f86b1fa706';
const ENC_DEC_API = 'https://enc-dec.app/api';
const VIDLINK_API = 'https://vidlink.pro/api/b';
const VIDLINK_HEADERS: Record<string, string> = {
  Connection: 'keep-alive',
  Referer: 'https://vidlink.pro/',
  Origin: 'https://vidlink.pro',
};

async function makeRequest(url: string, options: any = {}) {
  const defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    Accept: 'application/json,*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    Connection: 'keep-alive',
    ...options.headers,
  };
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: defaultHeaders,
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error: any) {
    console.error(`[Vidlink] Request failed for ${url}: ${error.message}`);
    throw error;
  }
}

async function getTmdbInfo(tmdbId: string, mediaType: string) {
  const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const response = await makeRequest(url);
  const data = (await response.json()) as any;
  const title = mediaType === 'tv' ? data.name : data.title;
  const year =
    mediaType === 'tv' ? data.first_air_date?.substring(0, 4) : data.release_date?.substring(0, 4);
  if (!title) {
    throw new Error('Could not extract title from TMDB response');
  }
  console.log(`[Vidlink] TMDB Info: "${title}" (${year})`);
  return { title, year, data };
}

async function encryptTmdbId(tmdbId: string) {
  console.log(`[Vidlink] Encrypting TMDB ID: ${tmdbId}`);
  const response = await makeRequest(`${ENC_DEC_API}/enc-vidlink?text=${tmdbId}`);
  const data = (await response.json()) as any;
  if (data && data.result) {
    console.log(`[Vidlink] Successfully encrypted TMDB ID`);
    return data.result;
  } else {
    throw new Error('Invalid encryption response format');
  }
}

function resolveUrl(url: string, baseUrl: string) {
  if (url.startsWith('http')) {
    return url;
  }
  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    console.error(`[Vidlink] Could not resolve URL: ${url} against ${baseUrl}`);
    return url;
  }
}

function getQualityFromResolution(resolution: string | null) {
  if (!resolution) return 'Auto';
  const [, height] = resolution.split('x').map(Number);
  if (height >= 2160) return '4K';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  return '240p';
}

function parseM3U8(content: string, baseUrl: string) {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line);
  const streams = [];
  let currentStream: any = null;
  for (const line of lines) {
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      currentStream = { bandwidth: null, resolution: null, url: null };
      const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
      if (bandwidthMatch) {
        currentStream.bandwidth = parseInt(bandwidthMatch[1]);
      }
      const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      if (resolutionMatch) {
        currentStream.resolution = resolutionMatch[1];
      }
    } else if (currentStream && !line.startsWith('#')) {
      currentStream.url = resolveUrl(line, baseUrl);
      streams.push(currentStream);
      currentStream = null;
    }
  }
  return streams;
}

async function fetchAndParseM3U8(playlistUrl: string, mediaInfo: any, subtitles: any[]) {
  console.log(`[Vidlink] Fetching M3U8 playlist: ${playlistUrl.substring(0, 80)}...`);
  try {
    const response = await makeRequest(playlistUrl, { headers: VIDLINK_HEADERS });
    const m3u8Content = await response.text();
    console.log(`[Vidlink] Parsing M3U8 content`);
    const parsedStreams = parseM3U8(m3u8Content, playlistUrl);
    if (parsedStreams.length === 0) {
      console.log('[Vidlink] No quality variants found, returning master playlist');
      return [
        {
          name: 'Vidlink - Auto',
          title: mediaInfo.title,
          url: playlistUrl,
          quality: 'Auto',
          size: 'Unknown',
          headers: {},
          provider: 'vidlink',
          subtitles: subtitles || [],
        },
      ];
    }
    console.log(`[Vidlink] Found ${parsedStreams.length} quality variants`);
    return parsedStreams.map(stream => {
      const quality = getQualityFromResolution(stream.resolution);
      return {
        name: `Vidlink - ${quality}`,
        title: mediaInfo.title,
        url: stream.url,
        quality,
        size: 'Unknown',
        headers: {},
        provider: 'vidlink',
        subtitles: subtitles || [],
      };
    });
  } catch (error: any) {
    console.error(`[Vidlink] Error fetching/parsing M3U8: ${error.message}`);
    return [
      {
        name: 'Vidlink - Auto',
        title: mediaInfo.title,
        url: playlistUrl,
        quality: 'Auto',
        size: 'Unknown',
        headers: {},
        provider: 'vidlink',
        subtitles: subtitles || [],
      },
    ];
  }
}

function extractQuality(streamData: any) {
  if (!streamData) return 'Unknown';
  const qualityFields = ['quality', 'resolution', 'label', 'name'];
  for (const field of qualityFields) {
    if (streamData[field]) {
      const quality = streamData[field].toString().toLowerCase();
      if (quality.includes('2160') || quality.includes('4k')) return '4K';
      if (quality.includes('1440') || quality.includes('2k')) return '1440p';
      if (quality.includes('1080') || quality.includes('fhd')) return '1080p';
      if (quality.includes('720') || quality.includes('hd')) return '720p';
      if (quality.includes('480') || quality.includes('sd')) return '480p';
      if (quality.includes('360')) return '360p';
      if (quality.includes('240')) return '240p';
      const match = quality.match(/(\d{3,4})[pP]?/);
      if (match) {
        const resolution = parseInt(match[1]);
        if (resolution >= 2160) return '4K';
        if (resolution >= 1440) return '1440p';
        if (resolution >= 1080) return '1080p';
        if (resolution >= 720) return '720p';
        if (resolution >= 480) return '480p';
        if (resolution >= 360) return '360p';
        return '240p';
      }
    }
  }
  return 'Unknown';
}

function createStreamTitle(mediaInfo: any) {
  if (mediaInfo.mediaType === 'tv' && mediaInfo.season && mediaInfo.episode) {
    return `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, '0')}E${String(mediaInfo.episode).padStart(2, '0')}`;
  }
  return mediaInfo.year ? `${mediaInfo.title} (${mediaInfo.year})` : mediaInfo.title;
}

function processVidlinkResponse(data: any, mediaInfo: any) {
  const streams: any[] = [];
  try {
    console.log(`[Vidlink] Processing response data`);
    const streamTitle = createStreamTitle(mediaInfo);
    const subtitles: any[] = [];
    const rawSubtitles =
      data.subtitles ||
      (data.stream && data.stream.subtitles) ||
      data.captions ||
      (data.stream && data.stream.captions) ||
      [];
    if (Array.isArray(rawSubtitles)) {
      rawSubtitles.forEach(sub => {
        if (sub.url) {
          subtitles.push({
            url: sub.url,
            language: sub.language || sub.lang || sub.label || 'Unknown',
            name: sub.name || sub.label || sub.language || sub.lang || 'Unknown',
            headers: {},
          });
        }
      });
    }
    if (data.stream && data.stream.qualities) {
      console.log(`[Vidlink] Processing qualities from stream object`);
      Object.entries(data.stream.qualities).forEach(([qualityKey, qualityData]: [string, any]) => {
        if (qualityData.url) {
          const quality = extractQuality({ quality: qualityKey });
          streams.push({
            name: `Vidlink - ${quality}`,
            title: streamTitle,
            url: qualityData.url,
            quality,
            size: 'Unknown',
            headers: {},
            provider: 'vidlink',
            subtitles,
          });
        }
      });
      if (data.stream.playlist) {
        streams.push({
          _isPlaylist: true,
          url: data.stream.playlist,
          mediaInfo: { ...mediaInfo, title: streamTitle },
          subtitles,
        });
      }
    } else if (data.stream && data.stream.playlist && !data.stream.qualities) {
      console.log(`[Vidlink] Processing playlist-only response`);
      streams.push({
        _isPlaylist: true,
        url: data.stream.playlist,
        mediaInfo: { ...mediaInfo, title: streamTitle },
        subtitles,
      });
    } else if (data.url) {
      const quality = extractQuality(data);
      streams.push({
        name: `Vidlink - ${quality}`,
        title: streamTitle,
        url: data.url,
        quality,
        size: 'Unknown',
        headers: {},
        provider: 'vidlink',
        subtitles,
      });
    } else if (data.streams && Array.isArray(data.streams)) {
      data.streams.forEach((stream: any, index: number) => {
        if (stream.url) {
          const quality = extractQuality(stream);
          streams.push({
            name: `Vidlink Stream ${index + 1} - ${quality}`,
            title: streamTitle,
            url: stream.url,
            quality,
            size: stream.size || 'Unknown',
            headers: {},
            provider: 'vidlink',
            subtitles,
          });
        }
      });
    } else if (data.links && Array.isArray(data.links)) {
      data.links.forEach((link: any, index: number) => {
        if (link.url) {
          const quality = extractQuality(link);
          streams.push({
            name: `Vidlink Link ${index + 1} - ${quality}`,
            title: streamTitle,
            url: link.url,
            quality,
            size: link.size || 'Unknown',
            headers: {},
            provider: 'vidlink',
            subtitles,
          });
        }
      });
    } else if (typeof data === 'object') {
      const findUrls = (obj: any) => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && (value.startsWith('http') || value.includes('.m3u8'))) {
            if (
              value.includes('.srt') ||
              value.includes('.vtt') ||
              value.includes('subtitle') ||
              value.includes('captions') ||
              key.toLowerCase().includes('subtitle') ||
              key.toLowerCase().includes('caption')
            ) {
              continue;
            }
            const quality = extractQuality({ [key]: value });
            streams.push({
              name: `Vidlink ${key} - ${quality}`,
              title: streamTitle,
              url: value,
              quality,
              size: 'Unknown',
              headers: {},
              provider: 'vidlink',
              subtitles,
            });
          } else if (typeof value === 'object' && value !== null) {
            if (!key.toLowerCase().includes('caption') && !key.toLowerCase().includes('subtitle')) {
              findUrls(value);
            }
          }
        }
      };
      findUrls(data);
    }
    console.log(`[Vidlink] Extracted ${streams.length} streams from response`);
  } catch (error: any) {
    console.error(`[Vidlink] Error processing response: ${error.message}`);
  }
  return streams;
}

const QUALITY_ORDER: Record<string, number> = {
  '4K': 5,
  '1440p': 4,
  '1080p': 3,
  '720p': 2,
  '480p': 1,
  '360p': 0,
  '240p': -1,
  Auto: -2,
  Unknown: -3,
};

export async function getStreams(
  tmdbId: string,
  mediaType = 'movie',
  seasonNum: string | number | null = null,
  episodeNum: string | number | null = null
) {
  console.log(
    `[Vidlink] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`
  );
  try {
    const { title, year } = await getTmdbInfo(tmdbId, mediaType);
    const encryptedId = await encryptTmdbId(tmdbId);
    let vidlinkUrl;
    if (mediaType === 'tv' && seasonNum && episodeNum) {
      vidlinkUrl = `${VIDLINK_API}/tv/${encryptedId}/${seasonNum}/${episodeNum}`;
    } else {
      vidlinkUrl = `${VIDLINK_API}/movie/${encryptedId}`;
    }
    console.log(`[Vidlink] Requesting: ${vidlinkUrl}`);
    const response = await makeRequest(vidlinkUrl, { headers: VIDLINK_HEADERS });
    const data = await response.json();
    console.log(`[Vidlink] Received response from Vidlink API`);
    const mediaInfo = {
      title,
      year,
      mediaType,
      season: seasonNum,
      episode: episodeNum,
    };
    const streams = processVidlinkResponse(data, mediaInfo);
    if (streams.length === 0) {
      console.log('[Vidlink] No streams found in response');
      return [];
    }
    const playlistStreams = streams.filter(s => s._isPlaylist);
    const directStreams = streams.filter(s => !s._isPlaylist);
    if (playlistStreams.length > 0) {
      console.log(`[Vidlink] Processing ${playlistStreams.length} M3U8 playlists`);
      const playlistPromises = playlistStreams.map(ps =>
        fetchAndParseM3U8(ps.url, ps.mediaInfo, ps.subtitles)
      );
      const parsedStreamArrays = await Promise.all(playlistPromises);
      const allStreams = directStreams.concat(...parsedStreamArrays);
      allStreams.sort(
        (a, b) => (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3)
      );
      console.log(`[Vidlink] Successfully processed ${allStreams.length} total streams`);
      return allStreams;
    } else {
      directStreams.sort(
        (a, b) => (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3)
      );
      console.log(`[Vidlink] Successfully processed ${directStreams.length} streams`);
      return directStreams;
    }
  } catch (error: any) {
    console.error(`[Vidlink] Error in getStreams: ${error.message}`);
    return [];
  }
}
