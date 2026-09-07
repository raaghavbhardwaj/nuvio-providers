/**
 * @fileoverview Shared HTTP header presets and builders for provider scrapers.
 * Conforms to Google TypeScript Style Guide.
 */

/**
 * Common User-Agent strings across supported client platforms.
 */
export const USER_AGENTS = {
  DESKTOP:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  MOBILE:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.179 Mobile Safari/537.36',
  ANDROID_TV:
    'Mozilla/5.0 (Linux; Android 12; BRAVIA 4K VH2 Build/BRAVIA_ATV4_EU) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
} as const;

/**
 * Creates standard HTTP request headers, automatically inferring the Origin from the Referer.
 *
 * @param referer Optional HTTP Referer URL to include.
 * @param userAgent User-Agent string to use (defaults to Desktop Chrome).
 * @returns An object containing HTTP header key-value pairs.
 */
export function createHeaders(
  referer?: string,
  userAgent: string = USER_AGENTS.DESKTOP
): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  if (referer) {
    headers['Referer'] = referer;
    try {
      const parsedUrl = new URL(referer);
      headers['Origin'] = parsedUrl.origin;
    } catch {
      // Ignore malformed referer URLs
    }
  }

  return headers;
}
