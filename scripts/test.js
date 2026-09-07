#!/usr/bin/env node

/**
 * Nuvio Provider CLI Test Runner
 * 
 * Tests a provider against real TMDB IDs and verifies returned streams.
 * 
 * Usage:
 *   node scripts/test.js <provider> [tmdbId] [movie|tv] [season] [episode] [--probe]
 * 
 * Examples:
 *   node scripts/test.js uhdmovies 872585
 *   node scripts/test.js hianime 872585 tv 1 1
 *   node scripts/test.js dooflix 872585 --probe
 */

const path = require('path');
const fs = require('fs');

async function probeUrl(url, headers = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1024',
        ...headers
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.status;
  } catch (err) {
    return 'ERR';
  }
}

async function run() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const shouldProbe = process.argv.includes('--probe');

  if (args.length === 0) {
    console.log(`
Usage: pnpm test <provider> [tmdbId] [movie|tv] [season] [episode] [--probe]

Examples:
  pnpm test uhdmovies 872585
  pnpm test hianime 37854 tv 1 1
  pnpm test dooflix 872585 --probe
`);
    process.exit(1);
  }

  const providerName = args[0];
  const tmdbId = args[1] || '872585'; // Default: Oppenheimer
  const mediaType = args[2] || 'movie';
  const season = args[3] ? parseInt(args[3], 10) : (mediaType === 'tv' ? 1 : null);
  const episode = args[4] ? parseInt(args[4], 10) : (mediaType === 'tv' ? 1 : null);

  const providerFile = path.resolve(__dirname, '..', 'providers', `${providerName}.js`);

  if (!fs.existsSync(providerFile)) {
    console.error(`❌ Provider file not found: providers/${providerName}.js`);
    console.error(`Did you run 'node build.js ${providerName}' first?`);
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`🎬 Testing Provider : ${providerName}`);
  console.log(`🎯 Target           : TMDB ${tmdbId} (${mediaType}${mediaType === 'tv' ? ` S${season}E${episode}` : ''})`);
  console.log(`========================================\n`);

  let providerModule;
  try {
    providerModule = require(providerFile);
  } catch (err) {
    console.error(`❌ Failed to load provider module:`, err);
    process.exit(1);
  }

  if (typeof providerModule.getStreams !== 'function') {
    console.error(`❌ providers/${providerName}.js does not export a 'getStreams' function!`);
    process.exit(1);
  }

  const startTime = performance.now();
  let streams = [];
  try {
    streams = await providerModule.getStreams(tmdbId, mediaType, season, episode);
  } catch (err) {
    console.error(`❌ getStreams() threw an unhandled error:`, err);
    process.exit(1);
  }
  const duration = (performance.now() - startTime).toFixed(0);

  if (!Array.isArray(streams) || streams.length === 0) {
    console.log(`⏱️  Response Time : ${duration}ms`);
    console.log(`⚠️  No streams found for TMDB ${tmdbId}.\n`);
    return;
  }

  console.log(`✨ Found ${streams.length} stream(s) in ${duration}ms:\n`);

  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    const quality = s.quality || 'Unknown';
    const title = s.title || 'Untitled';
    const subCount = s.subtitles ? s.subtitles.length : 0;
    
    let probeStatus = '';
    if (shouldProbe && s.url) {
      const code = await probeUrl(s.url, s.headers);
      probeStatus = code === 200 || code === 206 ? ` [\x1b[32mHTTP ${code}\x1b[0m]` : ` [\x1b[31mHTTP ${code}\x1b[0m]`;
    }

    console.log(` [${i + 1}] \x1b[36m${title}\x1b[0m (${quality})${probeStatus}`);
    console.log(`     URL  : ${s.url.length > 85 ? s.url.substring(0, 82) + '...' : s.url}`);
    if (subCount > 0) {
      console.log(`     Subs : ${subCount} subtitle track(s)`);
    }
  }

  console.log(`\n========================================\n`);
}

run().catch(console.error);
