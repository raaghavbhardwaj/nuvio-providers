const fs = require('fs');
const file = 'api/cinejoy.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Direct Streams fallback in extractServer mapping
content = content.replace(/\/\/ 2\. Secondary: Direct CDN Streams[\s\S]*?(?=return res\.status\(200\)\.json\({)/, '');

// 2. Add HLS Master playlist parsing to force max quality
const hlsProxyOld = `const rewritten = text
          .split('\\n')
          .map((line: string) => {`;
          
const hlsProxyNew = `
        const lines = text.split('\\n');
        const header: string[] = [];
        const streams: any[] = [];
        let currentStream: any = null;
        let isMaster = false;

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          if (line.startsWith('#EXT-X-STREAM-INF:')) {
            isMaster = true;
            currentStream = { tag: line, url: null, height: 0 };
            const resMatch = line.match(/RESOLUTION=\\d+x(\\d+)/);
            if (resMatch) currentStream.height = parseInt(resMatch[1]);
          } else if (currentStream && !line.startsWith('#')) {
            currentStream.url = line;
            streams.push(currentStream);
            currentStream = null;
          } else if (!currentStream) {
            header.push(line);
          }
        }

        let processText = text;
        if (isMaster && streams.length > 0) {
          streams.sort((a, b) => b.height - a.height);
          // Keep only the highest quality stream to force HD/4K playback
          processText = header.join('\\n') + '\\n' + streams[0].tag + '\\n' + streams[0].url + '\\n';
        }

        const rewritten = processText
          .split('\\n')
          .map((line: string) => {`;

content = content.replace(hlsProxyOld, hlsProxyNew);

fs.writeFileSync(file, content);
