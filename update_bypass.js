const fs = require('fs');

let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');

code = code.replace(
`async function fetchBypass(url: string, options: any = {}) {
    const targetUrl = encodeURIComponent(url);
    const proxyUrl = \`http://api.scraperapi.com?api_key=\${SCRAPER_API_KEY}&url=\${targetUrl}&render=true\`;
    return fetch(proxyUrl, options);
}`,
`async function fetchBypass(url: string, options: any = {}) {
    // Only route Cloudflare-protected domains through ScraperAPI
    if (url.includes('new2.vegamovies.futbol') || url.includes('vcloud.fit')) {
        const targetUrl = encodeURIComponent(url);
        const proxyUrl = \`http://api.scraperapi.com?api_key=\${SCRAPER_API_KEY}&url=\${targetUrl}&render=true\`;
        return fetch(proxyUrl, options);
    }
    // Fastdl, nexdrive, etc don't have CF, use normal fetch
    return fetch(url, options);
}`
);

fs.writeFileSync('src/vegamovies/index.ts', code);
