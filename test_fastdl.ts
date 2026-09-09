import cheerio from 'cheerio-without-node-native';

async function run() {
    const HEADERS = {
      'User-Agent': 'Mozilla/5.0'
    };
    const vcloudUrl = 'https://fastdl.zip/embed?download=hCJa2ID3fhaGRn6z8uBQ3uXvV';
    
    const fRes = await fetch(vcloudUrl, { headers: HEADERS });
    const fHtml = await fRes.text();
    
    const reMatch = fHtml.match(/var reurl = "([^"]+)"/);
    if (reMatch) {
         console.log("Matched reurl:", reMatch[1]);
         const dlUrl = reMatch[1];
         const dRes = await fetch(dlUrl, { headers: HEADERS });
         const dHtml = await dRes.text();
         const d$ = cheerio.load(dHtml);
         const finalUrl = d$('#vd').attr('href');
         console.log("Final URL:", finalUrl);
    } else {
         console.log("No reurl found");
    }
}
run();
