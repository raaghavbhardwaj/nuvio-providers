/**
 * Shared HTTP Headers & User-Agent presets
 */

export const USER_AGENTS = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  mobile: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.179 Mobile Safari/537.36',
  androidTV: 'Mozilla/5.0 (Linux; Android 12; BRAVIA 4K VH2 Build/BRAVIA_ATV4_EU) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
};

export function createHeaders(referer?: string, userAgent: string = USER_AGENTS.desktop): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  if (referer) {
    headers['Referer'] = referer;
    try {
      const url = new URL(referer);
      headers['Origin'] = url.origin;
    } catch {
      // Ignore if referer is not a valid URL
    }
  }

  return headers;
}
