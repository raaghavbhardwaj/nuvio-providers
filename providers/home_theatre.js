/**
 * home_theatre - Built from src/home_theatre/
 * Generated: 2026-09-09T12:56:36.004Z
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

// src/home_theatre/index.ts
var home_theatre_exports = {};
__export(home_theatre_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(home_theatre_exports);
var CLOUDFLARE_EDGE_API = "https://home-theatre.fancied.workers.dev/api/streams";
var getStreams = (tmdbId, mediaType, season, episode) => __async(void 0, null, function* () {
  try {
    const isTv = mediaType === "tv" || mediaType === "series" || typeof season === "number" && season > 0 || typeof season === "string" && season !== "";
    const typeParam = isTv ? "tv" : "movie";
    let url = `${CLOUDFLARE_EDGE_API}?tmdb=${encodeURIComponent(tmdbId)}&type=${typeParam}`;
    if (isTv) {
      const s = season != null ? String(season) : "1";
      const e = episode != null ? String(episode) : "1";
      url += `&s=${s}&e=${e}`;
    }
    console.log(`[Home_Theatre] Fetching edge streams from: ${url}`);
    const res = yield fetch(url);
    if (!res.ok) {
      console.warn(`[Home_Theatre] Edge API returned HTTP ${res.status}`);
      return [];
    }
    const data = yield res.json();
    if (!(data == null ? void 0 : data.streams) || !Array.isArray(data.streams)) {
      return [];
    }
    console.log(`[Home_Theatre] Successfully resolved ${data.streams.length} stream(s) via Cloudflare Edge.`);
    return data.streams;
  } catch (error) {
    console.error(`[Home_Theatre] Error fetching streams: ${(error == null ? void 0 : error.message) || error}`);
    return [];
  }
});
