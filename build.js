#!/usr/bin/env node

/**
 * Modernized Build Script for nuvio-providers
 * 
 * Bundles each provider from src/<provider>/ into providers/<provider>.js
 * Supports both TypeScript (.ts) and JavaScript (.js)
 * Native esbuild watcher with instant rebuilds
 * 
 * Usage:
 *   node build.js              # Build all providers
 *   node build.js <name>       # Build specific provider
 *   node build.js --watch      # Native incremental watch mode
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, 'providers');

// Directories in src/ that are shared libraries, not standalone providers
const IGNORED_DIRS = new Set(['common', 'types', 'utils']);

// Modules that the Nuvio app provides - don't bundle these
const EXTERNAL_MODULES = [
    'cheerio-without-node-native',
    'react-native-cheerio',
    'cheerio',
    'crypto-js',
    'axios'
];

function getProvidersToBuild() {
    const args = process.argv.slice(2).filter(arg => !arg.startsWith('-'));

    if (args.length > 0) {
        return args;
    }

    if (!fs.existsSync(srcDir)) {
        console.error('❌ src/ directory not found.');
        process.exit(1);
    }

    return fs.readdirSync(srcDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !IGNORED_DIRS.has(d.name))
        .map(d => d.name);
}

function getEntryPoint(providerName) {
    const providerDir = path.join(srcDir, providerName);
    const tsEntry = path.join(providerDir, 'index.ts');
    const jsEntry = path.join(providerDir, 'index.js');

    if (fs.existsSync(tsEntry)) return tsEntry;
    if (fs.existsSync(jsEntry)) return jsEntry;
    return null;
}

function getBuildConfig(providerName, entryPoint) {
    const outFile = path.join(outDir, `${providerName}.js`);
    return {
        entryPoints: [entryPoint],
        bundle: true,
        outfile: outFile,
        format: 'cjs',
        platform: 'neutral',
        target: 'es2016', // Transpile async/await for Hermes runtime
        minify: false,
        sourcemap: false,
        external: EXTERNAL_MODULES,
        banner: {
            js: `/**\n * ${providerName} - Built from src/${providerName}/\n * Generated: ${new Date().toISOString()}\n */`
        },
        logLevel: 'warning'
    };
}

async function buildProvider(providerName) {
    const entryPoint = getEntryPoint(providerName);
    if (!entryPoint) {
        console.warn(`⚠️  Skipping ${providerName}: no index.ts or index.js found in src/${providerName}/`);
        return false;
    }

    const outFile = path.join(outDir, `${providerName}.js`);
    try {
        await esbuild.build(getBuildConfig(providerName, entryPoint));
        const stats = fs.statSync(outFile);
        const sizeKB = (stats.size / 1024).toFixed(1);
        const ext = path.extname(entryPoint);
        console.log(`✅ ${providerName}.js (${sizeKB} KB) [from ${ext}]`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to build ${providerName}:`, err.message);
        return false;
    }
}

async function watchProviders(providers) {
    console.log(`\n👀 Starting native esbuild watcher for ${providers.length} provider(s)...\n`);
    
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
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
                    }
                }
            ]
        });

        await context.watch();
        console.log(`Watching src/${provider}/...`);
    }

    console.log('\nPress Ctrl+C to stop watching.\n');
}

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

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    let success = 0;
    let failed = 0;

    for (const provider of providers) {
        const result = await buildProvider(provider);
        if (result) success++;
        else failed++;
    }

    console.log(`\n✨ Done! ${success} built, ${failed} skipped/failed\n`);
}

main().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
