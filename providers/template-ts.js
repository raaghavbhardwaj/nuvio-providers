/**
 * template-ts - Built from src/template-ts/
 * Generated: 2026-09-07T15:57:54.802Z
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

// src/template-ts/index.ts
var template_ts_exports = {};
__export(template_ts_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(template_ts_exports);

// src/common/headers.ts
var USER_AGENTS = {
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  mobile: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.179 Mobile Safari/537.36",
  androidTV: "Mozilla/5.0 (Linux; Android 12; BRAVIA 4K VH2 Build/BRAVIA_ATV4_EU) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"
};
function createHeaders(referer, userAgent = USER_AGENTS.desktop) {
  const headers = {
    "User-Agent": userAgent,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9"
  };
  if (referer) {
    headers["Referer"] = referer;
    try {
      const url = new URL(referer);
      headers["Origin"] = url.origin;
    } catch (e) {
    }
  }
  return headers;
}

// src/template-ts/index.ts
var getStreams = (tmdbId, mediaType, season, episode) => __async(void 0, null, function* () {
  const headers = createHeaders("https://example.com");
  console.log(`[TemplateTS] Searching for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
  const streams = [
    {
      name: "TemplateTS",
      title: "Server 1 - 1080p [Fast]",
      url: `https://example.com/streams/${tmdbId}.m3u8`,
      quality: "1080p",
      format: "m3u8",
      headers,
      subtitles: [
        {
          url: `https://example.com/subs/${tmdbId}_en.vtt`,
          language: "en",
          name: "English"
        }
      ]
    }
  ];
  return streams;
});
