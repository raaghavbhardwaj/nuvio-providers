const fs = require('fs');

let index = fs.readFileSync('src/uhdmovies/index.ts', 'utf8');
index = index.replace(`...streams.map(s => ({`, `...(Array.isArray(streams) ? streams : []).map((s: any) => ({`);
fs.writeFileSync('src/uhdmovies/index.ts', index);

let utils = fs.readFileSync('src/uhdmovies/utils.ts', 'utf8');
utils = utils.replace(`export async function bypassHrefli(url: string): Promise<string> {`, `export async function bypassHrefli(url: string): Promise<string | null> {`);
utils = utils.replace(`export async function extractVideoSeed(finallink: string): Promise<any[]> {`, `export async function extractVideoSeed(finallink: string): Promise<any[] | null> {`);
utils = utils.replace(`export async function extractDriveseedPage(url: string): Promise<string | null> {`, `export async function extractDriveseedPage(url: string): Promise<any[] | null> {`);
fs.writeFileSync('src/uhdmovies/utils.ts', utils);
