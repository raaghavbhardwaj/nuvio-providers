import cheerio from 'cheerio-without-node-native';
import { MAIN_URL, SEARCH_URL, HEADERS } from './constants';

export async function getStreams(tmdbId: string, mediaType: string = 'movie', season: any = null, episode: any = null) {
  console.log(`[Vegamovies] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);

  try {
    // 1. Get TMDB Details (mock for testing, we just need title)
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`);
    const tmdbData = await tmdbRes.json();
    const title = (mediaType === 'tv' ? tmdbData.name : tmdbData.title) || '';
    
    // 2. Search Vegamovies
    const searchRes = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(title)}&page=1`, { headers: HEADERS });
    const searchData = await searchRes.json();

    if (!searchData.hits || searchData.hits.length === 0) return [];
    
    // Pick the most relevant hit
    let hit = searchData.hits[0].document;
    if (mediaType === 'tv' && season) {
        const targetSeason = `season ${season}`;
        const targetS = `s${Number(season) < 10 ? '0' + season : season}`;
        const tmdbTitle = title.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        let seasonHit = searchData.hits.find((h: any) => {
            const t = h.document.post_title.toLowerCase();
            const cleanT = t.replace(/[^a-z0-9 ]/g, '');
            // Prioritize strict title match
            return cleanT.includes('download ' + tmdbTitle + ' ') && (t.includes(targetSeason) || t.includes(targetS) || t.match(new RegExp(`season.*?\\b${season}\\b`)));
        });
        if (!seasonHit) {
            seasonHit = searchData.hits.find((h: any) => {
                const t = h.document.post_title.toLowerCase();
                return (t.includes(targetSeason) || t.includes(targetS) || t.match(new RegExp(`season.*?\\b${season}\\b`)));
            });
        }
        if (seasonHit) hit = seasonHit.document;
    }
    const postUrl = MAIN_URL + hit.permalink;

    console.log("Fetching URL:", postUrl); // 3. Fetch Post HTML
    const postRes = await fetch(postUrl, { headers: HEADERS });
    const postHtml = await postRes.text();
    const $ = cheerio.load(postHtml);

    const streams: any[] = [];
    
    // Vegamovies structure: <h5>Title 480p</h5> \n <p><a href="vcloud"><button>Download</button></a></p>
    $('h5, h4, h3').each((i: number, el: any) => {
      const headerText = $(el).text();
      
      let quality = 'Unknown';
      if (headerText.includes('2160p') || headerText.includes('4K')) quality = '4K';
      else if (headerText.includes('1080p')) quality = '1080p';
      else if (headerText.includes('720p')) quality = '720p';
      else if (headerText.includes('480p')) quality = '480p';
      
      let size = 'Unknown';
      const sizeMatch = headerText.match(/\[([^\]]+GB|[^\]]+MB)\]/i);
      if (sizeMatch) size = sizeMatch[1];

      // Vegamovies groups episodes in consecutive <p> tags under the header
      $(el).nextUntil('h5, h4, h3', 'p').each((j: number, pEl: any) => {
        const pText = $(pEl).text();
        // vcloudLink declared below
        
        
        let specificLink = undefined;
        $(pEl).find('a').each((_: any, aEl: any) => {
            const aText = $(aEl).text().toLowerCase();
            const aHref = $(aEl).attr('href') || '';
            if (aText.includes('v-cloud') || aText.includes('vcloud') || aText.includes('fastserver') || aHref.includes('vcloud.fit') || aHref.includes('fastdl.zip')) {
                specificLink = aHref;
            }
        });
        
        let vcloudLink = specificLink;
        if (!vcloudLink && $(pEl).find('a').length === 1) {
             vcloudLink = $(pEl).find('a').attr('href');
        }

        if (vcloudLink) {
          streams.push({ quality, size, url: vcloudLink, name: 'V-Cloud', epIndex: j + 1 });
        }
      });
    });

    const finalStreams: any[] = [];
    
    // 4. Resolve VCloud links
    for (const stream of streams) {
      try {
        
        
        let vcloudUrl = stream.url;
        if (vcloudUrl.includes('nexdrive.fit')) {
            const nexRes = await fetch(vcloudUrl, { headers: HEADERS });
            const nexHtml = await nexRes.text();
            const nex$ = cheerio.load(nexHtml);
            
            if (mediaType === 'tv' && episode) {
                // Find the episode header
                let epLink: string | null = null;
                nex$('h4, h3, h5, div').each((_: any, epEl: any) => {
                    const epText = nex$(epEl).text().toLowerCase();
                    const epRegex = new RegExp('episode[^0-9]*0?' + episode + '\\b', 'i');
                    if (epRegex.test(epText)) {
                        const nextP = nex$(epEl).nextAll('p').first();
                        epLink = nextP.find('a[href*="vcloud.fit"]').attr('href') || epLink;
                    }
                });
                
                // If we found an episode link, use it, else skip this stream (it doesn't have the episode)
                if (epLink) {
                    vcloudUrl = epLink;
                } else {
                    // Try to see if it's purely a single episode link by checking if there's only 1 vcloud link
                    if (nex$('a[href*="vcloud.fit"]').length === 1) {
                         vcloudUrl = nex$('a[href*="fastdl.zip"]').attr('href') || nex$('a[href*="vcloud.fit"]').attr('href') || vcloudUrl;
                    } else {
                         continue; // Skip this quality, doesn't have the requested episode
                    }
                }
            } else {
                vcloudUrl = nex$('a[href*="vcloud.fit"]').attr('href') || vcloudUrl;
            }
        }

        
        if (vcloudUrl.includes('fastdl.zip')) {
            const fRes = await fetch(vcloudUrl, { headers: HEADERS });
            const fHtml = await fRes.text();
            
            const reMatch = fHtml.match(/var reurl = "([^"]+)"/);
            if (reMatch) {
                 const dlUrl = reMatch[1];
                 const dRes = await fetch(dlUrl, { headers: HEADERS });
                 const dHtml = await dRes.text();
                 const d$ = cheerio.load(dHtml);
                 const finalUrl = d$('#vd').attr('href');
                 if (finalUrl) {
                     finalStreams.push({
                        server: 'VegaMovies Direct',
                        title: (mediaType === 'tv' ? `Ep ${episode || stream.epIndex} ` : '') + (stream.size ? `${stream.quality} - ${stream.size}` : `VegaMovies ${stream.quality}`),
                        quality: stream.quality,
                        size: stream.size,
                        url: finalUrl
                     });
                 }
            } else {
                 const f$ = cheerio.load(fHtml);
                 const finalUrl = f$('#vd').attr('href');
                 if (finalUrl) {
                     finalStreams.push({
                        server: 'VegaMovies Direct',
                        title: (mediaType === 'tv' ? `Ep ${episode || stream.epIndex} ` : '') + (stream.size ? `${stream.quality} - ${stream.size}` : `VegaMovies ${stream.quality}`),
                        quality: stream.quality,
                        size: stream.size,
                        url: finalUrl
                     });
                 }
            }
        } else if (vcloudUrl.includes('vcloud.fit')) {


            const vRes = await fetch(vcloudUrl, { headers: HEADERS });
            const vHtml = await vRes.text();

        
        // Find var url = atob(atob('...'))
        const atobMatch = vHtml.match(/var url = atob\(atob\('([^']+)'\)\)/);
        if (atobMatch) {
          const decoded = atob(atob(atobMatch[1]));
          
          const tRes = await fetch(decoded, { headers: HEADERS });
          const tHtml = await tRes.text();
          const $$ = cheerio.load(tHtml);
          
          const fslv2 = $$('a:contains("[FSLv2 Server]"), a:contains("[FSL Server]")').attr('href');
          if (fslv2) {
             finalStreams.push({
                server: 'VegaMovies Direct',
                title: (mediaType === 'tv' ? `Ep ${episode || stream.epIndex} ` : '') + (stream.size ? `${stream.quality} - ${stream.size}` : `VegaMovies ${stream.quality}`),
                quality: stream.quality,
                size: stream.size,
                url: fslv2
             });
          }
        }
      }
      } catch(e) {
        console.error("V-Cloud Resolve Error", e);
      }
    }
    
    // Sort
    const qualityOrder: Record<string, number> = { '4K': 4, '1080p': 3, '720p': 2, '480p': 1, 'Unknown': 0 };
    finalStreams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));

    return finalStreams;
  } catch (error: any) {
    console.error(`[Vegamovies] Error: ${error.message}`);
    return [];
  }
}
module.exports = { getStreams };
