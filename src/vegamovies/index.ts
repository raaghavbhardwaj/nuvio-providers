import cheerio from 'cheerio-without-node-native';
import { MAIN_URL, SEARCH_URL, HEADERS } from './constants';

export async function getStreams(tmdbId: string, mediaType: string = 'movie', season: any = null, episode: any = null) {
  console.log(`[Vegamovies] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);

  try {
    // 1. Get TMDB Details (mock for testing, we just need title)
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`);
    const tmdbData = await tmdbRes.json();
    const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;
    
    // 2. Search Vegamovies
    const searchRes = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(title)}&page=1`, { headers: HEADERS });
    const searchData = await searchRes.json();

    if (!searchData.hits || searchData.hits.length === 0) return [];
    
    // Pick the most relevant hit
    const hit = searchData.hits[0].document;
    const postUrl = MAIN_URL + hit.permalink;

    // 3. Fetch Post HTML
    const postRes = await fetch(postUrl, { headers: HEADERS });
    const postHtml = await postRes.text();
    const $ = cheerio.load(postHtml);

    const streams: any[] = [];
    
    // Vegamovies structure: <h5>Title 480p</h5> \n <p><a href="vcloud"><button>Download</button></a></p>
    $('h5, h4').each((i: number, el: any) => {
      const headerText = $(el).text();
      const nextP = $(el).next('p');
      if (nextP.length > 0) {
        const vcloudLink = nextP.find('a[href*="nexdrive.fit"], a[href*="vcloud.fit"], a[href*="fastdl.zip"]').attr('href');
        if (vcloudLink) {
          // Extract quality
          let quality = 'Unknown';
          if (headerText.includes('2160p') || headerText.includes('4K')) quality = '4K';
          else if (headerText.includes('1080p')) quality = '1080p';
          else if (headerText.includes('720p')) quality = '720p';
          else if (headerText.includes('480p')) quality = '480p';
          
          let size = 'Unknown';
          const sizeMatch = headerText.match(/\[([^\]]+GB|[^\]]+MB)\]/i);
          if (sizeMatch) size = sizeMatch[1];
          
          streams.push({ quality, size, url: vcloudLink, name: 'V-Cloud' });
        }
      }
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
            vcloudUrl = nex$('a[href*="vcloud.fit"]').attr('href') || vcloudUrl;
        }

        if (vcloudUrl.includes('vcloud.fit')) {
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
                title: stream.size ? `${stream.quality} - ${stream.size}` : `VegaMovies ${stream.quality}`,
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
