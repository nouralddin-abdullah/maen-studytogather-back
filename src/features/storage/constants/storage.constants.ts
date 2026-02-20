/**
 * Storage module constants
 * Injection tokens and provider types for the storage system
 */

/**
 * Injection token for storage configuration
 */
export const STORAGE_CONFIG = 'STORAGE_CONFIG';

/**
 * Injection token for storage provider instance
 */
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

/**
 * Supported storage provider types
 */
export enum StorageProviderType {
  /** Amazon S3 or S3-compatible storage (MinIO, DigitalOcean Spaces) */
  S3 = 's3',
  /** Cloudflare R2 storage */
  R2 = 'r2',
}
