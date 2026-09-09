const fs = require('fs');
let code = fs.readFileSync('functions/api/vidsrc.ts', 'utf8');
code = code.replace(
`    if (!seedRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch seed: status=\${seedRes.status}' }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }`,
`    if (!seedRes.ok) {
      const errBody = await seedRes.text();
      return new Response(JSON.stringify({ error: 'Failed to fetch seed', status: seedRes.status, body: errBody }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }`
);
fs.writeFileSync('functions/api/vidsrc.ts', code);
