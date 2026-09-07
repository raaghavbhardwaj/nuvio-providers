#!/usr/bin/env tsx

/**
 * @fileoverview Build and bundling pipeline for Nuvio providers.
 * Converts multi-file TypeScript/JavaScript source providers into single
 * standalone Hermes-compliant CommonJS bundles.
 */

import fs from 'fs';
import path from 'path';
import * as esbuild from 'esbuild';

const SRC_DIR = path.join(__dirname, 'src');
const OUT_DIR = path.join(__dirname, 'providers');

/** Directories in src/ that are shared libraries and should not be built as providers. */
const IGNORED_DIRS = new Set(['common', 'types', 'utils']);

/** External runtime dependencies provided directly by the Nuvio application. */
const EXTERNAL_MODULES = [
  'cheerio-without-node-native',
  'react-native-cheerio',
  'cheerio',
  'crypto-js',
  'axios',
];

/**
 * Discovers provider targets to build from command line arguments or the filesystem.
 *
 * @returns An array of provider directory names.
 */
function getProvidersToBuild(): string[] {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('-'));

  if (args.length > 0) {
    return args;
  }

  if (!fs.existsSync(SRC_DIR)) {
    console.error('❌ Error: src/ directory not found.');
    process.exit(1);
  }

  return fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !IGNORED_DIRS.has(dirent.name))
    .map(dirent => dirent.name);
}

/**
 * Resolves the entry point file for a provider (preferring index.ts over index.js).
 *
 * @param providerName Directory name under src/
 * @returns Absolute path to the entry point, or null if none exists.
 */
function getEntryPoint(providerName: string): string | null {
  const providerDir = path.join(SRC_DIR, providerName);
  const tsEntry = path.join(providerDir, 'index.ts');
  const jsEntry = path.join(providerDir, 'index.js');

  if (fs.existsSync(tsEntry)) return tsEntry;
  if (fs.existsSync(jsEntry)) return jsEntry;
  return null;
}

/**
 * Generates the esbuild configuration object for a provider.
 *
 * @param providerName The name of the provider.
 * @param entryPoint The resolved entry point path.
 * @returns An esbuild BuildOptions object.
 */
function getBuildConfig(providerName: string, entryPoint: string): esbuild.BuildOptions {
  const outFile = path.join(OUT_DIR, `${providerName}.js`);
  return {
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outFile,
    format: 'cjs',
    platform: 'neutral',
    target: 'es2016', // Transpiles async/await into generator functions for Hermes compatibility
    minify: false,
    sourcemap: false,
    external: EXTERNAL_MODULES,
    banner: {
      js: `/**\n * ${providerName} - Built from src/${providerName}/\n * Generated: ${new Date().toISOString()}\n */`,
    },
    logLevel: 'warning',
  };
}

/**
 * Builds a single provider.
 *
 * @param providerName Name of the provider.
 * @returns A Promise resolving to true on success, false on failure.
 */
async function buildProvider(providerName: string): Promise<boolean> {
  const entryPoint = getEntryPoint(providerName);
  if (!entryPoint) {
    console.warn(
      `⚠️  Skipping ${providerName}: no index.ts or index.js found in src/${providerName}/`
    );
    return false;
  }

  const outFile = path.join(OUT_DIR, `${providerName}.js`);
  try {
    await esbuild.build(getBuildConfig(providerName, entryPoint));
    const stats = fs.statSync(outFile);
    const sizeKb = (stats.size / 1024).toFixed(1);
    const ext = path.extname(entryPoint);
    console.log(`✅ ${providerName}.js (${sizeKb} KB) [from ${ext}]`);
    return true;
  } catch (err: any) {
    console.error(`❌ Failed to build ${providerName}:`, err.message);
    return false;
  }
}

/**
 * Starts esbuild native incremental file watch mode for active providers.
 *
 * @param providers Array of provider names to watch.
 */
async function watchProviders(providers: string[]): Promise<void> {
  console.log(`\n👀 Starting native esbuild watcher for ${providers.length} provider(s)...\n`);

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  for (const provider of providers) {
    const entryPoint = getEntryPoint(provider);
    if (!entryPoint) continue;

    const config = getBuildConfig(provider, entryPoint);
    const context = await esbuild.context({
      ...config,
      plugins: [
        {
          name: 'rebuild-notify',
          setup(build) {
            build.onEnd(result => {
              if (result.errors.length === 0) {
                console.log(`⚡ [Rebuilt] ${provider}.js at ${new Date().toLocaleTimeString()}`);
              }
            });
          },
        },
      ],
    });

    await context.watch();
    console.log(`Watching src/${provider}/...`);
  }

  console.log('\nPress Ctrl+C to stop watching.\n');
}

/**
 * CLI runner main execution.
 */
async function main() {
  const args = process.argv.slice(2);
  const isWatch = args.includes('--watch') || args.includes('-w');
  const providers = getProvidersToBuild();

  if (providers.length === 0) {
    console.log('No providers found in src/ directory.');
    return;
  }

  if (isWatch) {
    await watchProviders(providers);
    return;
  }

  console.log(`\n📦 Building ${providers.length} provider(s)...\n`);

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  let successCount = 0;
  let failedCount = 0;

  for (const provider of providers) {
    const success = await buildProvider(provider);
    if (success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`\n✨ Done! ${successCount} built, ${failedCount} skipped/failed\n`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal build error:', err);
  process.exit(1);
});
