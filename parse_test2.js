const text = `
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
480/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080
1080/playlist.m3u8
`;

const lines = text.split('\n');
const header = [];
const streams = [];
let currentStream = null;
let isMaster = false;

for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
        isMaster = true;
        currentStream = { tag: line, url: null, height: 0 };
        const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
        if (resMatch) currentStream.height = parseInt(resMatch[1]);
    } else if (currentStream && !line.startsWith('#')) {
        currentStream.url = line;
        streams.push(currentStream);
        currentStream = null;
    } else if (!currentStream) {
        header.push(line);
    }
}

if (isMaster && streams.length > 0) {
    streams.sort((a, b) => b.height - a.height);
    let out = header.join('\n') + '\n';
    // Keep only the highest quality
    out += streams[0].tag + '\n' + streams[0].url + '\n';
    console.log("Master rewrite:\n" + out);
} else {
    console.log("Not master");
}
