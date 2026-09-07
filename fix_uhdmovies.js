const fs = require('fs');

let index = fs.readFileSync('src/uhdmovies/index.ts', 'utf8');
index = index.replace('async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1)', 'export async function getStreams(tmdbId: string, mediaType: string, seasonNum: number = 1, episodeNum: number = 1): Promise<any[]>');
index = index.replace(`$search('article.gridlove-post, article.latestPost').each((i, el) => {`, `$search('article.gridlove-post, article.latestPost').each((i: number, el: any) => {`);
index = index.replace(`const allStreams = [];`, `const allStreams: any[] = [];`);
index = index.replace(`$('div.entry-content > p, div.entry-content > div').each((i, el) => {`, `$('div.entry-content > p, div.entry-content > div').each((i: number, el: any) => {`);
index = index.replace(`$('pre, p, a, h3').each((i, el) => {`, `$('pre, p, a, h3').each((i: number, el: any) => {`);
index = index.replace(`const episodesMap = {};`, `const episodesMap: Record<string, string[]> = {};`);
index = index.replace(`urls.forEach(url => {`, `urls.forEach((url: string) => {`);
index = index.replace(`console.error('[UHDMovies] Error:', e.message);`, `console.error('[UHDMovies] Error:', (e as Error).message);`);
fs.writeFileSync('src/uhdmovies/index.ts', index);

let utils = fs.readFileSync('src/uhdmovies/utils.ts', 'utf8');
utils = utils.replace(`export function getBaseUrl(url) {`, `export function getBaseUrl(url: string) {`);
utils = utils.replace(`export function fixUrl(url, domain) {`, `export function fixUrl(url: string, domain: string) {`);
utils = utils.replace(`export async function bypassHrefli(url) {`, `export async function bypassHrefli(url: string): Promise<string> {`);
utils = utils.replace(`$1('form#landing input').each((_, el) => {`, `$1('form#landing input').each((_: any, el: any) => {`);
utils = utils.replace(`$2('form#landing input').each((_, el) => {`, `$2('form#landing input').each((_: any, el: any) => {`);
utils = utils.replace(`formData1[$1(el).attr('name')] =`, `formData1[$1(el).attr('name') as string] =`);
utils = utils.replace(`formData2[$2(el).attr('name')] =`, `formData2[$2(el).attr('name') as string] =`);
utils = utils.replace(`const formData1 = {};`, `const formData1: Record<string, string> = {};`);
utils = utils.replace(`const formData2 = {};`, `const formData2: Record<string, string> = {};`);
utils = utils.replace(`export async function fetchTmdbDetails(tmdbId, mediaType) {`, `export async function fetchTmdbDetails(tmdbId: string, mediaType: string): Promise<any> {`);
utils = utils.replace(`export function getIndexQuality(str) {`, `export function getIndexQuality(str: string): string {`);
utils = utils.replace(`export async function extractVideoSeed(finallink) {`, `export async function extractVideoSeed(finallink: string): Promise<any[]> {`);
utils = utils.replace(`export async function extractDriveseedPage(url) {`, `export async function extractDriveseedPage(url: string): Promise<string | null> {`);
fs.writeFileSync('src/uhdmovies/utils.ts', utils);
