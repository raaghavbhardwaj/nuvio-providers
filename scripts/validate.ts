#!/usr/bin/env tsx
export {};

/**
 * @fileoverview Manifest validation script for Nuvio provider repositories.
 * Enforces JSON integrity, schema completeness, and filesystem consistency.
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.resolve(__dirname, '..', 'manifest.json');
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Validates manifest.json according to Nuvio provider specifications.
 */
function validateManifest() {
  console.log('\n🔍 Validating manifest.json...\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ Error: manifest.json not found in repository root.');
    process.exit(1);
  }

  let manifest;
  try {
    const rawContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    manifest = JSON.parse(rawContent);
  } catch (err) {
    console.error('❌ Error: manifest.json contains invalid JSON syntax:', (err as any).message);
    process.exit(1);
  }

  const errors = [];
  const warnings: string[] = [];

  if (!manifest.name) errors.push('Root object missing required "name" field.');
  if (!manifest.version) errors.push('Root object missing required "version" field.');
  if (!Array.isArray(manifest.scrapers)) {
    errors.push('Root "scrapers" property must be an array.');
    console.error('Validation failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  const seenIds = new Set();
  const seenFiles = new Set();

  manifest.scrapers.forEach((scraper: any, index: number) => {
    const label = `Scraper #${index + 1} (${scraper.name || scraper.id || 'unnamed'}):`;

    if (!scraper.id) {
      errors.push(`${label} missing required "id".`);
    } else if (seenIds.has(scraper.id)) {
      errors.push(`${label} duplicate id "${scraper.id}".`);
    } else {
      seenIds.add(scraper.id);
    }

    if (!scraper.name) errors.push(`${label} missing required "name".`);
    if (!scraper.version) errors.push(`${label} missing required "version".`);
    if (typeof scraper.enabled !== 'boolean') {
      errors.push(`${label} "enabled" must be a boolean.`);
    }

    if (!Array.isArray(scraper.supportedTypes) || scraper.supportedTypes.length === 0) {
      errors.push(`${label} "supportedTypes" must be a non-empty array of 'movie'|'tv'.`);
    } else {
      for (const mediaType of scraper.supportedTypes) {
        if (mediaType !== 'movie' && mediaType !== 'tv') {
          errors.push(`${label} invalid type "${mediaType}" in supportedTypes.`);
        }
      }
    }

    if (!scraper.filename) {
      errors.push(`${label} missing required "filename".`);
    } else {
      const fullPath = path.join(ROOT_DIR, scraper.filename);
      if (!fs.existsSync(fullPath)) {
        errors.push(`${label} referenced file "${scraper.filename}" does not exist on disk.`);
      }
      if (seenFiles.has(scraper.filename)) {
        warnings.push(`${label} reuses filename "${scraper.filename}".`);
      } else {
        seenFiles.add(scraper.filename);
      }
    }

    if (!scraper.logo) {
      warnings.push(`${label} missing "logo" icon URL.`);
    }
  });

  if (warnings.length > 0) {
    console.log('⚠️  Validation Warnings:');
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

validateManifest();
