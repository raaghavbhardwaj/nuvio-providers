const fs = require('fs');

let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');

const SCRAPER_API_KEY = "ee912511f247b04434400d2eb3548e20";

const bypassFunc = `
async function fetchBypass(url: string, options: any = {}) {
    const targetUrl = encodeURIComponent(url);
    const proxyUrl = \`http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=\${targetUrl}&render=true\`;
    return fetch(proxyUrl, options);
}
`;

// Insert the bypassFunc after imports
code = code.replace(/import { MAIN_URL, SEARCH_URL, HEADERS } from '\.\/constants';/, "import { MAIN_URL, SEARCH_URL, HEADERS } from './constants';\n" + bypassFunc);

// Replace fetch calls EXCEPT tmdb
code = code.replace(/fetch\(\`\$\{SEARCH_URL/g, 'fetchBypass(`${SEARCH_URL');
code = code.replace(/fetch\(postUrl/g, 'fetchBypass(postUrl');
code = code.replace(/fetch\(vcloudUrl/g, 'fetchBypass(vcloudUrl');
code = code.replace(/fetch\(nexUrl/g, 'fetchBypass(nexUrl');
code = code.replace(/fetch\(dlUrl/g, 'fetchBypass(dlUrl');
code = code.replace(/fetch\(epLink/g, 'fetchBypass(epLink');

// Bump root manifest
let manifest = fs.readFileSync('manifest.json', 'utf8');
manifest = manifest.replace(
  `"version": "1.0.6",\n  "scrapers":`,
  `"version": "1.0.7",\n  "scrapers":`
);
manifest = manifest.replace(
  `"id": "vegamovies",
      "name": "Vegamovies",
      "description": "High quality 1080p/4K direct links with V-Cloud and G-Direct extraction. No Cloudflare blocking.",
      "version": "1.0.6",`,
  `"id": "vegamovies",
      "name": "Vegamovies",
      "description": "High quality 1080p/4K direct links via ScraperAPI (Bypasses Cloudflare Turnstile automatically).",
      "version": "1.0.7",`
);

fs.writeFileSync('src/vegamovies/index.ts', code);
fs.writeFileSync('manifest.json', manifest);
