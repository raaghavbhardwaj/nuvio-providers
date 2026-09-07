#!/usr/bin/env node

/**
 * Manifest Validator for nuvio-providers
 * 
 * Verifies that manifest.json conforms to Nuvio's schema and all referenced files exist.
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.resolve(__dirname, '..', 'manifest.json');
const rootDir = path.resolve(__dirname, '..');

function validate() {
  console.log('\n🔍 Validating manifest.json...\n');

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json not found in repository root!');
    process.exit(1);
  }

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
  } catch (err) {
    console.error('❌ manifest.json is not valid JSON:', err.message);
    process.exit(1);
  }

  let errors = [];
  let warnings = [];

  if (!manifest.name) errors.push('Root missing "name" field');
  if (!manifest.version) errors.push('Root missing "version" field');
  if (!Array.isArray(manifest.scrapers)) {
    errors.push('Root "scrapers" must be an array');
    console.error('Validation failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  const seenIds = new Set();
  const seenFiles = new Set();

  manifest.scrapers.forEach((scraper, index) => {
    const prefix = `Scraper #${index + 1} (${scraper.name || scraper.id || 'unnamed'}):`;

    if (!scraper.id) errors.push(`${prefix} missing "id"`);
    else if (seenIds.has(scraper.id)) errors.push(`${prefix} duplicate id "${scraper.id}"`);
    else seenIds.add(scraper.id);

    if (!scraper.name) errors.push(`${prefix} missing "name"`);
    if (!scraper.version) errors.push(`${prefix} missing "version"`);
    if (typeof scraper.enabled !== 'boolean') errors.push(`${prefix} "enabled" must be boolean`);

    if (!Array.isArray(scraper.supportedTypes) || scraper.supportedTypes.length === 0) {
      errors.push(`${prefix} "supportedTypes" must be non-empty array of 'movie'|'tv'`);
    } else {
      scraper.supportedTypes.forEach(t => {
        if (t !== 'movie' && t !== 'tv') {
          errors.push(`${prefix} invalid type "${t}" in supportedTypes`);
        }
      });
    }

    if (!scraper.filename) {
      errors.push(`${prefix} missing "filename"`);
    } else {
      const fullPath = path.join(rootDir, scraper.filename);
      if (!fs.existsSync(fullPath)) {
        errors.push(`${prefix} referenced file "${scraper.filename}" does not exist on disk`);
      }
      if (seenFiles.has(scraper.filename)) {
        warnings.push(`${prefix} reuses filename "${scraper.filename}"`);
      } else {
        seenFiles.add(scraper.filename);
      }
    }

    if (!scraper.logo) {
      warnings.push(`${prefix} missing "logo" icon URL`);
    }
  });

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.error('❌ Validation Failed with Errors:');
    errors.forEach(e => console.error(`   ${e}`));
    console.log('');
    process.exit(1);
  }

  console.log(`✅ manifest.json is 100% valid! Checked ${manifest.scrapers.length} provider(s).\n`);
}

validate();
