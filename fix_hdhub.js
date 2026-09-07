const fs = require('fs');

function addAny(content) {
  // Simple regex to fix parameter types in function declarations/expressions
  // It's brittle but works for this specific codebase
  content = content.replace(/function\s+(\w+)\(([^)]+)\)/g, (match, name, params) => {
    const newParams = params.split(',').map(p => {
      p = p.trim();
      if (!p || p.includes(':') || p.includes('=')) return p;
      return `${p}: any`;
    }).join(', ');
    return `function ${name}(${newParams})`;
  });

  content = content.replace(/=>/g, (match, offset, string) => {
      // Very naive, just to fix simple arrow functions
      return match;
  });

  return content;
}

const files = ['constants.ts', 'extractors.ts', 'index.ts', 'utils.ts'].map(f => 'src/hdhub4u/' + f);
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/import cheerio from 'cheerio-without-node-native';/g, "import cheerio from 'cheerio-without-node-native';");
  
  // Specific fixes
  text = text.replace(/async function getStreams\(tmdbId, mediaType = 'movie', season = null, episode = null\)/g, "export async function getStreams(tmdbId: string, mediaType: string = 'movie', season: any = null, episode: any = null)");
  text = text.replace(/async function getTMDBDetails\(tmdbId, mediaType\)/g, "async function getTMDBDetails(tmdbId: string, mediaType: string): Promise<any>");
  text = text.replace(/export async function extractBypassUrl\(url\)/g, "export async function extractBypassUrl(url: string): Promise<string>");
  text = text.replace(/export async function bypassGDTot\(url\)/g, "export async function bypassGDTot(url: string): Promise<string>");
  text = text.replace(/export async function bypassHubCloud\(url\)/g, "export async function bypassHubCloud(url: string): Promise<string>");
  text = text.replace(/export async function bypassDriveLeech\(url\)/g, "export async function bypassDriveLeech(url: string): Promise<string>");
  text = text.replace(/export async function resolveStream\(rawUrl\)/g, "export async function resolveStream(rawUrl: string): Promise<any>");
  text = text.replace(/export async function getLatestDomain\(\)/g, "export async function getLatestDomain(): Promise<string>");
  text = text.replace(/export function findBestTitleMatch\(mediaInfo, searchResults, mediaType, season\)/g, "export function findBestTitleMatch(mediaInfo: any, searchResults: any[], mediaType: string, season: any): any");
  text = text.replace(/export function extractServerName\(source\)/g, "export function extractServerName(source: string): string");
  text = text.replace(/export function formatBytes\(bytes\)/g, "export function formatBytes(bytes: number): string");
  text = text.replace(/export function cleanTitle\(title\)/g, "export function cleanTitle(title: string): string");
  text = text.replace(/export function cleanDisplayTitle\(raw\)/g, "export function cleanDisplayTitle(raw: string): string");

  // Fix implicit any in maps and each
  text = text.replace(/\.map\(\(i, el\)/g, ".map((i: number, el: any)");
  text = text.replace(/\.each\(\(i, el\)/g, ".each((i: number, el: any)");
  text = text.replace(/\.map\(\(i2, a\)/g, ".map((i2: number, a: any)");
  text = text.replace(/\.map\(async blockUrl =>/g, ".map(async (blockUrl: string) =>");
  text = text.replace(/\.map\(async linkInfo =>/g, ".map(async (linkInfo: any) =>");
  text = text.replace(/\.map\(ext =>/g, ".map((ext: any) =>");
  text = text.replace(/\.map\(part =>/g, ".map((part: string) =>");
  text = text.replace(/\.filter\(w =>/g, ".filter((w: string) =>");
  text = text.replace(/\.every\(w =>/g, ".every((w: string) =>");

  // Fix missing imports or error messages
  text = text.replace(/console\.error\(\`\[HDHub4u\] Scraping error: \$\{error\.message\}\`\);/g, "console.error(`[HDHub4u] Scraping error: ${(error as Error).message}`);");
  text = text.replace(/console\.error\(\`\[HDHub4u\] Failed to fetch latest domains: \$\{error\.message\}\`\);/g, "console.error(`[HDHub4u] Failed to fetch latest domains: ${(error as Error).message}`);");
  text = text.replace(/console\.error\(\`\[HDHub4u\] Extractor error \(\$\{type\}\): \$\{error\.message\}\`\);/g, "console.error(`[HDHub4u] Extractor error (${type}): ${(error as Error).message}`);");

  fs.writeFileSync(file, text);
}
