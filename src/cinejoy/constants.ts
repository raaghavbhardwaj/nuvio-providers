/**
 * @fileoverview Constants and configuration for the Cinejoy provider.
 */

export const CINEJOY_ORIGIN = 'https://cinejoy.to';
export const CINEJOY_REFERER = 'https://cinejoy.to/';

export const API_GATEWAY_URL = 'https://api.shegu.st';
export const SUBTITLES_API_URL = 'https://subtitles.shegu.st';
export const ENC_DEC_API_URL = 'https://enc-dec.app/api';
export const CINEJOY_EDGE_API = 'https://nuvio-providers.pages.dev/api/cinejoy';

/**
 * Top fast and reliable server names supported by Cinejoy.
 */
export const SERVERS = ['Lisbon', 'Nebula', 'Solara', 'Joy'] as const;

export type CinejoyServer = (typeof SERVERS)[number];

export const CINEJOY_HEADERS: Record<string, string> = {
  Accept: '*/*',
  Origin: CINEJOY_ORIGIN,
  Referer: CINEJOY_REFERER,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};
