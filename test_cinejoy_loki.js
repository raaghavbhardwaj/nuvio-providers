async function run() {
  const ENC_DEC_API_URL = 'https://enc-dec.app/api';
  const API_GATEWAY_URL = 'https://api.shegu.st';
  const CINEJOY_HEADERS = {
    Accept: '*/*',
    Origin: 'https://cinejoy.to',
    Referer: 'https://cinejoy.to/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  };

  const targetUrl = `${API_GATEWAY_URL}/?type=series&tmdb=84958&server=Lisbon&season=2&episode=1`;
  console.log("Target URL:", targetUrl);

  const encUrl = `${ENC_DEC_API_URL}/enc-cinejoy?url=${encodeURIComponent(targetUrl)}`;
  const encRes = await fetch(encUrl);
  const encJson = await encRes.json();
  console.log("encJson:", encJson.status);

  const { data, state } = encJson.result;
  const binaryPayload = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  const gateRes = await fetch(`${API_GATEWAY_URL}/g`, {
    method: 'POST',
    headers: { ...CINEJOY_HEADERS, 'Content-Type': 'application/octet-stream' },
    body: binaryPayload,
  });
  console.log("gateRes status:", gateRes.status);
  const gateBuffer = Buffer.from(await gateRes.arrayBuffer());

  const decRes = await fetch(`${ENC_DEC_API_URL}/dec-cinejoy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: gateBuffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
      state,
    }),
  });
  const decJson = await decRes.json();
  console.log("decJson result:", JSON.stringify(decJson, null, 2));
}

run();
