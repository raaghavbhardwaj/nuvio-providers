#!/usr/bin/env tsx
export {};

/**
 * @fileoverview CLI test runner for Nuvio providers.
 * Executes a provider locally against given TMDB metadata, measures response latency,
 * inspects stream structure, and optionally probes link accessibility.
 */

const path = require('path');
const fs = require('fs');

/**
 * Sends a lightweight HTTP Range request to check if a media URL responds with 200/206.
 *
 * @param url Stream target URL to probe.
 * @param headers Optional headers (Referer, User-Agent, etc.).
 * @returns An HTTP status code or string describing the result.
 */
async function probeUrl(url: string, headers: any = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-1024',
        ...headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.status;
  } catch {
    return 'ERR';
  }
}

/**
 * Main test runner command.
 */
async function main() {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const shouldProbe = process.argv.includes('--probe');

  if (args.length === 0) {
    console.log(`
Usage: pnpm test <provider> [tmdbId] [movie|tv] [season] [episode] [--probe]

Examples:
  pnpm test uhdmovies 872585
  pnpm test hianime 37854 tv 1 1
  pnpm test template-ts 872585 --probe
`);
    process.exit(1);
  }

  const providerName = args[0];
  const tmdbId = args[1] || '872585'; // Default: Oppenheimer
  const mediaType = args[2] || 'movie';
  const season = args[3] ? parseInt(args[3], 10) : mediaType === 'tv' ? 1 : null;
  const episode = args[4] ? parseInt(args[4], 10) : mediaType === 'tv' ? 1 : null;

  const providerFile = path.resolve(__dirname, '..', 'providers', `${providerName}.js`);

  if (!fs.existsSync(providerFile)) {
    console.error(`❌ Error: Provider bundle not found: providers/${providerName}.js`);
    console.error(`Please run 'pnpm build ${providerName}' before running tests.`);
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`🎬 Testing Provider : ${providerName}`);
  console.log(
    `🎯 Target           : TMDB ${tmdbId} (${mediaType}${mediaType === 'tv' ? ` S${season}E${episode}` : ''})`
  );
  console.log(`========================================\n`);

  let providerModule;
  try {
    providerModule = require(providerFile);
  } catch (err) {
    console.error(`❌ Failed to import providers/${providerName}.js:`, err);
    process.exit(1);
  }

  if (typeof providerModule.getStreams !== 'function') {
    console.error(`❌ providers/${providerName}.js does not export a 'getStreams' function.`);
    process.exit(1);
  }

  const startTime = performance.now();
  let streams = [];
  try {
    streams = await providerModule.getStreams(tmdbId, mediaType, season, episode);
  } catch (err) {
    console.error(`❌ getStreams() threw an unhandled exception:`, err);
    process.exit(1);
  }
  const latencyMs = (performance.now() - startTime).toFixed(0);

  if (!Array.isArray(streams) || streams.length === 0) {
    console.log(`⏱️  Response Time : ${latencyMs}ms`);
    console.log(`⚠️  No streams found for TMDB ${tmdbId}.\n`);
    return;
  }

  console.log(`✨ Found ${streams.length} stream(s) in ${latencyMs}ms:\n`);

  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i];
    const quality = stream.quality || 'Unknown';
    const title = stream.title || 'Untitled';
    const subCount = stream.subtitles ? stream.subtitles.length : 0;

    let probeStatus = '';
    if (shouldProbe && stream.url) {
      const code = await probeUrl(stream.url, stream.headers);
      probeStatus =
        code === 200 || code === 206
          ? ` [\x1b[32mHTTP ${code}\x1b[0m]`
          : ` [\x1b[31mHTTP ${code}\x1b[0m]`;
    }

    console.log(` [${i + 1}] \x1b[36m${title}\x1b[0m (${quality})${probeStatus}`);
    console.log(
      `     URL  : ${stream.url.length > 85 ? stream.url.substring(0, 82) + '...' : stream.url}`
    );
    if (subCount > 0) {
      console.log(`     Subs : ${subCount} subtitle track(s)`);
    }
  }

  console.log(`\n========================================\n`);
}

main().catch(console.error);
