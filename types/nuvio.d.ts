/**
 * Nuvio Provider API Type Definitions
 */

export type MediaType = 'movie' | 'tv';

export type Quality = '4K' | '1080p' | '720p' | '480p' | '360p' | 'CAM' | string;

export interface Subtitle {
  url: string;
  language: string; // ISO 639-1 code (e.g. 'en', 'es', 'hi')
  name?: string;     // Display name (e.g. 'English', 'Spanish [CC]')
  headers?: Record<string, string>;
}

export interface Stream {
  name: string;                   // Scraper/Provider name (e.g. "StreamFlix")
  title: string;                  // Stream display label (e.g. "Server 1 - 1080p (HQ)")
  url: string;                    // Playable stream URL (.m3u8, .mp4, .mkv)
  quality?: Quality;              // Quality indicator
  size?: number | string;         // Size in bytes or formatted string (e.g. "1.5 GB")
  headers?: Record<string, string>; // Playback headers (e.g. Referer, User-Agent)
  subtitles?: Subtitle[];         // Associated subtitles
  format?: 'm3u8' | 'mp4' | 'mkv' | string;
}

export type GetStreams = (
  tmdbId: string,
  mediaType: MediaType,
  season: number | null,
  episode: number | null
) => Promise<Stream[]>;

export interface ProviderModule {
  getStreams: GetStreams;
}

export interface ScraperManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  supportedTypes: MediaType[];
  filename: string;
  enabled: boolean;
  formats?: string[];
  logo?: string;
  contentLanguage?: string[];
  hasSettings?: boolean;
  limited?: boolean;
  disabledPlatforms?: ('ios' | 'android' | 'tizen' | 'webos')[];
  supportsExternalPlayer?: boolean;
}

export interface ProviderManifest {
  name: string;
  version: string;
  scrapers: ScraperManifest[];
}
