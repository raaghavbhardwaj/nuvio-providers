const fs = require('fs');
let index = fs.readFileSync('src/uhdmovies/index.ts', 'utf8');

// Replace await fetch(...) with await fetchProxy(...)
index = index.replace(/await fetch\(/g, "await fetchProxy(");

// Add fetchProxy import
index = `import { fetchProxy } from './utils';\n` + index;

fs.writeFileSync('src/uhdmovies/index.ts', index);

let utils = fs.readFileSync('src/uhdmovies/utils.ts', 'utf8');

// Replace await fetch(...) with await fetchProxy(...) inside utils
utils = utils.replace(/await fetch\(/g, "await fetchProxy(");

// Add fetchProxy function
const proxyFn = `
export async function fetchProxy(url: string, options: any = {}): Promise<Response> {
  const proxyUrl = 'https://nuvio-providers-rose.vercel.app/api/proxy?url=' + encodeURIComponent(url);
  return fetch(proxyUrl, options);
}
`;
utils = utils + '\n' + proxyFn;

fs.writeFileSync('src/uhdmovies/utils.ts', utils);
