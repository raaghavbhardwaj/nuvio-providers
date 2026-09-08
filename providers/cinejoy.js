/**
 * cinejoy - Built from src/cinejoy/
 * Generated: 2026-09-08T07:10:44.495Z
 */
"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/cinejoy/index.ts
var cinejoy_exports = {};
__export(cinejoy_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(cinejoy_exports);

// src/cinejoy/constants.ts
var CINEJOY_ORIGIN = "https://cinejoy.to";
var CINEJOY_REFERER = "https://cinejoy.to/";
var API_GATEWAY_URL = "https://api.shegu.st";
var SUBTITLES_API_URL = "https://subtitles.shegu.st";
var ENC_DEC_API_URL = "https://enc-dec.app/api";
var CINEJOY_EDGE_API = "https://nuvio-providers-rose.vercel.app/api/cinejoy";
var SERVERS = ["Lisbon", "Solara", "Nebula", "Joy"];
var CINEJOY_HEADERS = {
  Accept: "*/*",
  Origin: CINEJOY_ORIGIN,
  Referer: CINEJOY_REFERER,
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
};

// src/cinejoy/utils.ts
var B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}
function base64urlEncode(bytes) {
  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[(b0 & 3) << 4 | b1 >> 4];
    if (i + 1 < len) {
      result += B64_CHARS[(b1 & 15) << 2 | b2 >> 6];
    }
    if (i + 2 < len) {
      result += B64_CHARS[b2 & 63];
    }
  }
  return result.replace(/\+/g, "-").replace(/\//g, "_");
}
function base64urlDecode(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const len = base64.length;
  let placeHolders = 0;
  if (base64[len - 1] === "=")
    placeHolders++;
  if (base64[len - 2] === "=")
    placeHolders++;
  const byteLen = len * 3 / 4 - placeHolders;
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded0 = B64_LOOKUP[base64.charCodeAt(i)];
    const encoded1 = B64_LOOKUP[base64.charCodeAt(i + 1)];
    const encoded2 = B64_LOOKUP[base64.charCodeAt(i + 2)];
    const encoded3 = B64_LOOKUP[base64.charCodeAt(i + 3)];
    bytes[p++] = encoded0 << 2 | encoded1 >> 4;
    if (p < byteLen)
      bytes[p++] = (encoded1 & 15) << 4 | encoded2 >> 2;
    if (p < byteLen)
      bytes[p++] = (encoded2 & 3) << 6 | encoded3 & 63;
  }
  return bytes;
}
function fetchCinejoySubtitles(mediaType, tmdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      let url = `${SUBTITLES_API_URL}/subtitles?type=${mediaType}&tmdb=${encodeURIComponent(tmdbId)}`;
      if (mediaType === "tv" && season && episode) {
        url += `&season=${season}&episode=${episode}`;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4e3);
      const response = yield fetch(url, {
        headers: CINEJOY_HEADERS,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok)
        return [];
      const json = yield response.json();
      const list = Array.isArray(json) ? json : Array.isArray(json.subtitles) ? json.subtitles : [];
      return list.filter((item) => item.url).map((item) => ({
        url: item.url,
        language: item.language || "en",
        name: item.display || item.language || "Subtitle"
      }));
    } catch (e) {
      return [];
    }
  });
}

// src/cinejoy/extractor.ts
function extractServerStream(server, mediaType, tmdbId, season, episode) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const typeParam = mediaType === "tv" ? "series" : "movie";
      let targetUrl = `${API_GATEWAY_URL}/?type=${typeParam}&tmdb=${encodeURIComponent(tmdbId)}&server=${encodeURIComponent(server)}`;
      if (mediaType === "tv" && season && episode) {
        targetUrl += `&season=${season}&episode=${episode}`;
      }
      const encUrl = `${ENC_DEC_API_URL}/enc-cinejoy?url=${encodeURIComponent(targetUrl)}`;
      const encController = new AbortController();
      const encTimeout = setTimeout(() => encController.abort(), 6e3);
      const encResponse = yield fetch(encUrl, {
        signal: encController.signal
      });
      clearTimeout(encTimeout);
      if (!encResponse.ok)
        return [];
      const encJson = yield encResponse.json();
      if (encJson.status !== 200 || !encJson.result)
        return [];
      const { data, state } = encJson.result;
      const binaryPayload = base64urlDecode(data);
      const gateController = new AbortController();
      const gateTimeout = setTimeout(() => gateController.abort(), 6e3);
      const gateResponse = yield fetch(`${API_GATEWAY_URL}/g`, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, CINEJOY_HEADERS), {
          "Content-Type": "application/octet-stream"
        }),
        body: binaryPayload.buffer,
        signal: gateController.signal
      });
      clearTimeout(gateTimeout);
      if (!gateResponse.ok)
        return [];
      const gateArrayBuffer = yield gateResponse.arrayBuffer();
      const gateBytes = new Uint8Array(gateArrayBuffer);
      const decController = new AbortController();
      const decTimeout = setTimeout(() => decController.abort(), 6e3);
      const decResponse = yield fetch(`${ENC_DEC_API_URL}/dec-cinejoy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: base64urlEncode(gateBytes),
          state
        }),
        signal: decController.signal
      });
      clearTimeout(decTimeout);
      if (!decResponse.ok)
        return [];
      const decJson = yield decResponse.json();
      const streamList = ((_b = (_a = decJson == null ? void 0 : decJson.result) == null ? void 0 : _a.data) == null ? void 0 : _b.stream) || [];
      const streams = [];
      for (const item of streamList) {
        const streamUrl = item.playlist || item.url;
        if (!streamUrl)
          continue;
        streams.push({
          name: "Cinejoy",
          title: `Server [${server}] - 4K/1080p Auto (HLS)`,
          url: streamUrl,
          quality: "1080p",
          format: "m3u8",
          headers: CINEJOY_HEADERS
        });
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}

// src/cinejoy/index.ts
var getStreams = (tmdbId, mediaType, season, episode) => __async(void 0, null, function* () {
  try {
    console.log(
      `[Cinejoy] Resolving streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? ` S${season}E${episode}` : ""}`
    );
    try {
      const typeParam = mediaType === "tv" ? "series" : "movie";
      let edgeUrl = `${CINEJOY_EDGE_API}?tmdb=${encodeURIComponent(tmdbId)}&type=${typeParam}`;
      if (mediaType === "tv" && season && episode) {
        edgeUrl += `&season=${season}&episode=${episode}`;
      }
      const edgeRes = yield fetch(edgeUrl);
      if (edgeRes.ok) {
        const edgeData = yield edgeRes.json();
        if ((edgeData == null ? void 0 : edgeData.streams) && Array.isArray(edgeData.streams) && edgeData.streams.length > 0) {
          console.log(`[Cinejoy] Resolved ${edgeData.streams.length} stream(s) via Edge API.`);
          return edgeData.streams;
        }
      }
    } catch (e) {
    }
    const [subtitles, ...serverResults] = yield Promise.all([
      fetchCinejoySubtitles(mediaType, tmdbId, season, episode),
      ...SERVERS.map((server) => extractServerStream(server, mediaType, tmdbId, season, episode))
    ]);
    const allStreams = [];
    for (const res of serverResults) {
      if (Array.isArray(res) && res.length > 0) {
        for (const s of res) {
          allStreams.push(__spreadProps(__spreadValues({}, s), {
            subtitles: subtitles.length > 0 ? subtitles : void 0
          }));
        }
      }
    }
    console.log(`[Cinejoy] Successfully resolved ${allStreams.length} stream(s).`);
    return allStreams;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Cinejoy] Extraction error: ${message}`);
    return [];
  }
});
