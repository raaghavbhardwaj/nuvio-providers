/**
 * vidsrc - Built from src/vidsrc/
 * Generated: 2026-09-09T06:52:27.649Z
 */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/vidsrc/index.ts
var vidsrc_exports = {};
__export(vidsrc_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(vidsrc_exports);

// src/vidsrc/constants.ts
var VIDSRC_HEADERS = {
  Accept: "*/*",
  Origin: "https://player.videasy.to",
  Referer: "https://player.videasy.to/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
};
var API_BASE = "https://api.speedracelight.com";
var DEC_API_URL = "https://enc-dec.app/api/dec-videasy";
var SUBTITLES_API_URL = "https://subtitles.shegu.st/subtitles";
var SERVERS = [
  { id: "cdn", name: "VidSrc [Yoru]" },
  { id: "m4uhd", name: "VidSrc [Breach]" }
];

// src/vidsrc/index.ts
var VIDSRC_EDGE_API = "https://nuvio-providers-rose.vercel.app/api/vidsrc";
var QUALITY_ORDER = {
  "4K": 5,
  "2160p": 5,
  "1440p": 4,
  "1080p": 3,
  "720p": 2,
  "480p": 1,
  "360p": 0,
  Auto: -1,
  Unknown: -2
};
function normalizeQuality(q) {
  const clean = q.trim();
  if (/^(4k|2160p)$/i.test(clean))
    return "4K";
  if (/^1080p$/i.test(clean))
    return "1080p";
  if (/^720p$/i.test(clean))
    return "720p";
  if (/^480p$/i.test(clean))
    return "480p";
  if (/^360p$/i.test(clean))
    return "360p";
  return clean || "1080p";
}
function fetchSubtitles(mediaType, tmdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      let url = `${SUBTITLES_API_URL}?type=${mediaType}&tmdb=${encodeURIComponent(tmdbId)}`;
      if (mediaType === "tv" && season && episode) {
        url += `&season=${season}&episode=${episode}`;
      }
      const res = yield fetch(url);
      if (!res.ok)
        return [];
      const json = yield res.json();
      const list = Array.isArray(json) ? json : Array.isArray(json == null ? void 0 : json.subtitles) ? json.subtitles : [];
      return list.filter((item) => item == null ? void 0 : item.url).map((item) => ({
        url: item.url,
        language: item.language || "en",
        name: item.display || item.language || "Subtitle"
      }));
    } catch (e) {
      return [];
    }
  });
}
function fetchServerStreams(serverId, serverLabel, mediaType, tmdbId, title, year, imdbId, seed, season, episode, subtitles) {
  return __async(this, null, function* () {
    try {
      const encTitle = encodeURIComponent(encodeURIComponent(title));
      const enc = "2";
      let targetUrl = `${API_BASE}/${serverId}/sources-with-title?title=${encTitle}&mediaType=${mediaType}&year=${year}&tmdbId=${tmdbId}&imdbId=${imdbId}&enc=${enc}&seed=${seed}`;
      if (mediaType === "tv" && season && episode) {
        targetUrl = `${API_BASE}/${serverId}/sources-with-title?title=${encTitle}&mediaType=tv&year=${year}&episodeId=${episode}&seasonId=${season}&tmdbId=${tmdbId}&imdbId=${imdbId}&enc=${enc}&seed=${seed}`;
      }
      const encRes = yield fetch(targetUrl, { headers: VIDSRC_HEADERS });
      const encText = yield encRes.text();
      if (!encText || encText.includes("error") || encText.includes("bad")) {
        return [];
      }
      const decRes = yield fetch(DEC_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: encText, id: tmdbId, seed })
      });
      if (!decRes.ok)
        return [];
      const decData = yield decRes.json();
      if (decData.status !== 200 || !decData.result)
        return [];
      const streams = [];
      const result = decData.result;
      if (result.playlist) {
        streams.push({
          name: serverLabel,
          title: `${serverLabel} - Master (Auto HLS)`,
          url: result.playlist,
          quality: "1080p",
          format: "m3u8",
          subtitles
        });
      }
      if (result.sources && Array.isArray(result.sources)) {
        for (const src of result.sources) {
          if (!src.url)
            continue;
          const normQ = normalizeQuality(src.quality);
          streams.push({
            name: serverLabel,
            title: `${serverLabel} - ${normQ}`,
            url: src.url,
            quality: normQ,
            format: "m3u8",
            subtitles
          });
        }
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
var getStreams = (tmdbId, mediaType, season, episode) => __async(void 0, null, function* () {
  var _a;
  try {
    console.log(
      `[VidSrc] Resolving streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? ` S${season}E${episode}` : ""}`
    );
    try {
      const isTv = mediaType === "tv" || mediaType === "series" || typeof season === "number" && season > 0 || typeof season === "string" && season !== "";
      const typeParam = isTv ? "series" : "movie";
      let edgeUrl = `${VIDSRC_EDGE_API}?tmdb=${encodeURIComponent(tmdbId)}&type=${typeParam}`;
      if (isTv) {
        const s = season != null ? String(season) : "1";
        const e = episode != null ? String(episode) : "1";
        edgeUrl += `&season=${s}&episode=${e}`;
      }
      const edgeRes = yield fetch(edgeUrl);
      if (edgeRes.ok) {
        const edgeData = yield edgeRes.json();
        if ((edgeData == null ? void 0 : edgeData.streams) && Array.isArray(edgeData.streams) && edgeData.streams.length > 0) {
          console.log(`[VidSrc] Resolved ${edgeData.streams.length} stream(s) via Edge API.`);
          return edgeData.streams;
        }
      }
    } catch (e) {
    }
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49&append_to_response=external_ids`;
    const tmdbRes = yield fetch(tmdbUrl);
    if (!tmdbRes.ok)
      return [];
    const tmdbData = yield tmdbRes.json();
    const title = (mediaType === "tv" ? tmdbData.name : tmdbData.title) || "";
    const dateStr = (mediaType === "tv" ? tmdbData.first_air_date : tmdbData.release_date) || "";
    const year = dateStr.slice(0, 4) || "2023";
    const imdbId = tmdbData.imdb_id || ((_a = tmdbData.external_ids) == null ? void 0 : _a.imdb_id) || "";
    if (!title)
      return [];
    const [seedRes, subtitles] = yield Promise.all([
      fetch(`${API_BASE}/seed?mediaId=${tmdbId}`, { headers: VIDSRC_HEADERS }),
      fetchSubtitles(mediaType, tmdbId, season, episode)
    ]);
    if (!seedRes.ok)
      return [];
    const seedData = yield seedRes.json();
    const seed = seedData == null ? void 0 : seedData.seed;
    if (!seed)
      return [];
    const serverResults = yield Promise.all(
      SERVERS.map(
        (srv) => fetchServerStreams(
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
      const qA = QUALITY_ORDER[a.quality || "Unknown"] || -2;
      const qB = QUALITY_ORDER[b.quality || "Unknown"] || -2;
      return qB - qA;
    });
    console.log(`[VidSrc] Successfully resolved ${allStreams.length} stream(s).`);
    return allStreams;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[VidSrc] Extraction error: ${message}`);
    return [];
  }
});
