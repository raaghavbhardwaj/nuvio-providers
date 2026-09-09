/**
 * @fileoverview Constants and configuration for the VidSrc provider.
 */

export const VIDSRC_HEADERS: Record<string, string> = {
  Accept: '*/*',
  Origin: 'https://player.videasy.to',
  Referer: 'https://player.videasy.to/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
};

export const API_BASE = 'https://api.speedracelight.com';
export const DEC_API_URL = 'https://enc-dec.app/api/dec-videasy';
export const SUBTITLES_API_URL = 'https://subtitles.shegu.st/subtitles';

export const SERVERS = [
  { id: 'cdn', name: 'VidSrc [Yoru]' },
  { id: 'm4uhd', name: 'VidSrc [Breach]' },
] as const;
