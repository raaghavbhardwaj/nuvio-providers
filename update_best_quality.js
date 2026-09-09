const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');

// Sort streams before resolving so we only pick the best one
const sortLogic = `
    const qualityOrder: Record<string, number> = { '4K': 4, '1080p': 3, '720p': 2, '480p': 1, 'Unknown': 0 };
    streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
    // Only keep the top 2 streams to prevent ScraperAPI from taking 85 seconds
    const topStreams = streams.slice(0, 2);
    
    await Promise.all(topStreams.map(async (stream) => {
`;

code = code.replace(`await Promise.all(streams.map(async (stream) => {`, sortLogic);

let manifest = fs.readFileSync('manifest.json', 'utf8');
manifest = manifest.replace(
  `"version": "1.0.8",\n  "scrapers":`,
  `"version": "1.0.9",\n  "scrapers":`
);
manifest = manifest.replace(
  `"version": "1.0.8",`,
  `"version": "1.0.9",`
);
fs.writeFileSync('src/vegamovies/index.ts', code);
fs.writeFileSync('manifest.json', manifest);
