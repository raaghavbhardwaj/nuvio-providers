/**
 * @fileoverview Type definitions for the Nuvio Provider and Streaming Plugin API.
 * Follows Google TypeScript Style Guide conventions.
 */

/**
 * Supported media content types in Nuvio.
 */
export type MediaType = 'movie' | 'tv';

/**
 * Standard stream resolution/quality categories.
 */
export type Quality = '4K' | '1080p' | '720p' | '480p' | '360p' | 'CAM' | string;

/**
 * Subtitle track information associated with a stream.
 */
export interface Subtitle {
  /** Direct URL to subtitle file (.vtt, .srt, .ass). */
  url: string;
  /** ISO 639-1 language code (e.g., 'en', 'es', 'hi'). */
  language: string;
  /** Optional human-readable language label (e.g., 'English', 'Spanish [CC]'). */
  name?: string;
  /** Optional HTTP headers required to fetch the subtitle. */
  headers?: Record<string, string>;
}

/**
 * Media stream returned by a Nuvio provider scraper.
 */
export interface Stream {
  /** Identifier or brand of the provider that found this stream (e.g., "StreamFlix"). */
  name: string;
  /** Display label for the stream shown in the Nuvio user interface. */
  title: string;
  /** Direct playable media URL (.m3u8, .mp4, or .mkv). */
  url: string;
  /** Resolution or quality tag. */
  quality?: Quality;
  /** File size in bytes or formatted human-readable string (e.g., "1.4 GB"). */
  size?: number | string;
  /** HTTP headers necessary for the video player to access the stream (e.g., Referer). */
  headers?: Record<string, string>;
  /** Subtitle tracks available for this stream. */
  subtitles?: Subtitle[];
  /** Video container or protocol format. */
  format?: 'm3u8' | 'mp4' | 'mkv' | string;
}

/**
 * Main provider entry-point function invoked by Nuvio.
 *
 * @param tmdbId The Movie Database (TMDB) identifier string.
 * @param mediaType Whether the requested title is a movie or TV show.
 * @param season The season number (1-indexed for TV shows, null for movies).
 * @param episode The episode number (1-indexed for TV shows, null for movies).
 * @returns A Promise resolving to an array of playable Streams.
 */
export type GetStreams = (
  tmdbId: string,
  mediaType: MediaType,
  season: number | null,
  episode: number | null
) => Promise<Stream[]>;

/**
 * Module shape expected by Nuvio's plugin loader.
 */
export interface ProviderModule {
  getStreams: GetStreams;
}

/**
 * Configuration entry for an individual scraper in manifest.json.
 */
export interface ScraperManifest {
  /** Unique provider identifier (lowercase, alphanumeric, hyphens/underscores). */
  id: string;
  /** User-facing display name. */
  name: string;
  /** Brief description of content sources and provider behavior. */
  description: string;
  /** Semantic version string (e.g., "1.0.0"). */
  version: string;
  /** Maintainer name or handle. */
  author?: string;
  /** Array of supported media types (['movie'], ['tv'], or both). */
  supportedTypes: MediaType[];
  /** Relative path to bundled script file (e.g., "providers/streamflix.js"). */
  filename: string;
  /** Whether the provider is active by default. */
  enabled: boolean;
  /** Supported stream formats (e.g., ['m3u8', 'mp4']). */
  formats?: string[];
  /** URL to the provider's icon or logo image. */
  logo?: string;
  /** Primary content languages (ISO language codes). */
  contentLanguage?: string[];
  /** Whether the provider provides configurable user settings in the app. */
  hasSettings?: boolean;
  /** Flag for rate-limited or restricted providers. */
  limited?: boolean;
  /** Platforms where this provider is incompatible and should be disabled. */
  disabledPlatforms?: ('ios' | 'android' | 'tizen' | 'webos')[];
  /** Whether playback supports external players (e.g., VLC, MPV). */
  supportsExternalPlayer?: boolean;
}

/**
 * Schema for the root manifest.json registry.
 */
export interface ProviderManifest {
  /** Repository display name. */
  name: string;
  /** Repository semantic version. */
  version: string;
  /** Collection of registered scrapers. */
  scrapers: ScraperManifest[];
}
