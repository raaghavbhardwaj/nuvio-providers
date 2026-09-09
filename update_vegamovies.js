const fs = require('fs');

// 1. Fix index.ts
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');

// Fix title fallback
code = code.replace(
  `const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;`,
  `const title = (mediaType === 'tv' ? tmdbData.name : tmdbData.title) || '';`
);

// Fix TS errors
code = code.replace(
  `$(pEl).find('a').each((_, aEl) => {`,
  `$(pEl).find('a').each((_: any, aEl: any) => {`
);

code = code.replace(
  `let epLink = null;`,
  `let epLink: string | null = null;`
);

code = code.replace(
  `nex$('h4, h3, h5, div').each((_, epEl) => {`,
  `nex$('h4, h3, h5, div').each((_: any, epEl: any) => {`
);

fs.writeFileSync('src/vegamovies/index.ts', code);

// 2. Fix manifest.json
let manifest = fs.readFileSync('manifest.json', 'utf8');
manifest = manifest.replace(
  `"id": "vegamovies",
      "name": "Vegamovies",
      "description": "High quality 1080p/4K direct links with V-Cloud extraction. No Cloudflare blocking.",
      "version": "1.0.0",`,
  `"id": "vegamovies",
      "name": "Vegamovies",
      "description": "High quality 1080p/4K direct links with V-Cloud and G-Direct extraction. No Cloudflare blocking.",
      "version": "1.0.5",`
);
fs.writeFileSync('manifest.json', manifest);

