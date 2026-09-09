/**
 * vegamovies - Built from src/vegamovies/
 * Generated: 2026-09-09T05:55:00.348Z
 */
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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

// src/vegamovies/index.ts
var vegamovies_exports = {};
__export(vegamovies_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(vegamovies_exports);
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/vegamovies/constants.ts
var MAIN_URL = "https://new2.vegamovies.futbol";
var SEARCH_URL = "https://new2.vegamovies.futbol/ts-search.php";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

// src/vegamovies/index.ts
function fetchBypass(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const targetUrl = encodeURIComponent(url);
    const proxyUrl = `http://api.scraperapi.com?api_key=ee912511f247b04434400d2eb3548e20&url=${targetUrl}&render=true`;
    return fetch(proxyUrl, options);
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    console.log(`[Vegamovies] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
    try {
      const tmdbRes = yield fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`);
      const tmdbData = yield tmdbRes.json();
      const title = (mediaType === "tv" ? tmdbData.name : tmdbData.title) || "";
      const searchRes = yield fetchBypass(`${SEARCH_URL}?q=${encodeURIComponent(title)}&page=1`, { headers: HEADERS });
      const searchData = yield searchRes.json();
      if (!searchData.hits || searchData.hits.length === 0)
        return [];
      let hit = searchData.hits[0].document;
      if (mediaType === "tv" && season) {
        const targetSeason = `season ${season}`;
        const targetS = `s${Number(season) < 10 ? "0" + season : season}`;
        const tmdbTitle = title.toLowerCase().replace(/[^a-z0-9 ]/g, "");
        let seasonHit = searchData.hits.find((h) => {
          const t = h.document.post_title.toLowerCase();
          const cleanT = t.replace(/[^a-z0-9 ]/g, "");
          return cleanT.includes("download " + tmdbTitle + " ") && (t.includes(targetSeason) || t.includes(targetS) || t.match(new RegExp(`season.*?\\b${season}\\b`)));
        });
        if (!seasonHit) {
          seasonHit = searchData.hits.find((h) => {
            const t = h.document.post_title.toLowerCase();
            return t.includes(targetSeason) || t.includes(targetS) || t.match(new RegExp(`season.*?\\b${season}\\b`));
          });
        }
        if (seasonHit)
          hit = seasonHit.document;
      }
      const postUrl = MAIN_URL + hit.permalink;
      console.log("Fetching URL:", postUrl);
      const postRes = yield fetchBypass(postUrl, { headers: HEADERS });
      const postHtml = yield postRes.text();
      const $ = import_cheerio_without_node_native.default.load(postHtml);
      const streams = [];
      $("h5, h4, h3").each((i, el) => {
        const headerText = $(el).text();
        let quality = "Unknown";
        if (headerText.includes("2160p") || headerText.includes("4K"))
          quality = "4K";
        else if (headerText.includes("1080p"))
          quality = "1080p";
        else if (headerText.includes("720p"))
          quality = "720p";
        else if (headerText.includes("480p"))
          quality = "480p";
        let size = "Unknown";
        const sizeMatch = headerText.match(/\[([^\]]+GB|[^\]]+MB)\]/i);
        if (sizeMatch)
          size = sizeMatch[1];
        $(el).nextUntil("h5, h4, h3", "p").each((j, pEl) => {
          const pText = $(pEl).text();
          let specificLink = void 0;
          $(pEl).find("a").each((_, aEl) => {
            const aText = $(aEl).text().toLowerCase();
            const aHref = $(aEl).attr("href") || "";
            if (aText.includes("v-cloud") || aText.includes("vcloud") || aText.includes("fastserver") || aHref.includes("vcloud.fit") || aHref.includes("fastdl.zip")) {
              specificLink = aHref;
            }
          });
          let vcloudLink = specificLink;
          if (!vcloudLink && $(pEl).find("a").length === 1) {
            vcloudLink = $(pEl).find("a").attr("href");
          }
          if (vcloudLink) {
            streams.push({ quality, size, url: vcloudLink, name: "V-Cloud", epIndex: j + 1 });
          }
        });
      });
      const finalStreams = [];
      const qualityOrder = { "4K": 4, "1080p": 3, "720p": 2, "480p": 1, "Unknown": 0 };
      streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
      const topStreams = streams.slice(0, 2);
      yield Promise.all(topStreams.map((stream) => __async(this, null, function* () {
        try {
          let vcloudUrl = stream.url;
          if (vcloudUrl.includes("nexdrive.fit")) {
            const nexRes = yield fetchBypass(vcloudUrl, { headers: HEADERS });
            const nexHtml = yield nexRes.text();
            const nex$ = import_cheerio_without_node_native.default.load(nexHtml);
            if (mediaType === "tv" && episode) {
              let epLink = null;
              nex$("h4, h3, h5, div").each((_, epEl) => {
                const epText = nex$(epEl).text().toLowerCase();
                const epRegex = new RegExp("episode[^0-9]*0?" + episode + "\\b", "i");
                if (epRegex.test(epText)) {
                  const nextP = nex$(epEl).nextAll("p").first();
                  epLink = nextP.find('a[href*="vcloud.fit"]').attr("href") || epLink;
                }
              });
              if (epLink) {
                vcloudUrl = epLink;
              } else {
                if (nex$('a[href*="vcloud.fit"]').length === 1) {
                  vcloudUrl = nex$('a[href*="fastdl.zip"]').attr("href") || nex$('a[href*="vcloud.fit"]').attr("href") || vcloudUrl;
                } else {
                  return;
                }
              }
            } else {
              vcloudUrl = nex$('a[href*="vcloud.fit"]').attr("href") || vcloudUrl;
            }
          }
          if (vcloudUrl.includes("fastdl.zip")) {
            const fRes = yield fetchBypass(vcloudUrl, { headers: HEADERS });
            const fHtml = yield fRes.text();
            const reMatch = fHtml.match(/var reurl = "([^"]+)"/);
            if (reMatch) {
              const dlUrl = reMatch[1];
              const dRes = yield fetchBypass(dlUrl, { headers: HEADERS });
              const dHtml = yield dRes.text();
              const d$ = import_cheerio_without_node_native.default.load(dHtml);
              const finalUrl = d$("#vd").attr("href");
              if (finalUrl) {
                finalStreams.push({
                  server: "VegaMovies Direct",
                  title: (mediaType === "tv" ? `Ep ${episode || stream.epIndex} ` : "") + (stream.size ? `${stream.quality} - ${stream.size}` : `VegaMovies ${stream.quality}`),
                  quality: stream.quality,
                  size: stream.size,
                  url: finalUrl
                });
              }
            } else {
              const f$ = import_cheerio_without_node_native.default.load(fHtml);
              const finalUrl = f$("#vd").attr("href");
              if (finalUrl) {
                finalStreams.push({
                  server: "VegaMovies Direct",
                  title: (mediaType === "tv" ? `Ep ${episode || stream.epIndex} ` : "") + (stream.size ? `${stream.quality} - ${stream.size}` : `VegaMovies ${stream.quality}`),
                  quality: stream.quality,
                  size: stream.size,
                  url: finalUrl
                });
              }
            }
          } else if (vcloudUrl.includes("vcloud.fit")) {
            const vRes = yield fetchBypass(vcloudUrl, { headers: HEADERS });
            const vHtml = yield vRes.text();
            const atobMatch = vHtml.match(/var url = atob\(atob\('([^']+)'\)\)/);
            if (atobMatch) {
              const decoded = atob(atob(atobMatch[1]));
              const tRes = yield fetch(decoded, { headers: HEADERS });
              const tHtml = yield tRes.text();
              const $$ = import_cheerio_without_node_native.default.load(tHtml);
              const fslv2 = $$('a:contains("[FSLv2 Server]"), a:contains("[FSL Server]")').attr("href");
              if (fslv2) {
                finalStreams.push({
                  server: "VegaMovies Direct",
                  title: (mediaType === "tv" ? `Ep ${episode || stream.epIndex} ` : "") + (stream.size ? `${stream.quality} - ${stream.size}` : `VegaMovies ${stream.quality}`),
                  quality: stream.quality,
                  size: stream.size,
                  url: fslv2
                });
              }
            }
          }
        } catch (e) {
          console.error("V-Cloud Resolve Error", e);
        }
      })));
      finalStreams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
      return finalStreams;
    } catch (error) {
      console.error(`[Vegamovies] Error: ${error.message}`);
      return [];
    }
  });
}
