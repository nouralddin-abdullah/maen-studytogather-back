import { ModuleMetadata } from '@nestjs/common';
import { StorageProviderType } from '../constants/storage.constants';

/**
 * Configuration options for the storage module
 */
export interface StorageConfig {
  /** The storage provider type (s3, r2) */
  provider: StorageProviderType;

  /** Custom endpoint URL (required for R2, optional for S3-compatible) */
  endpoint?: string;

  /** AWS region (e.g., 'us-east-1') */
  region: string;

  /** Access key ID for authentication */
  accessKeyId: string;

  /** Secret access key for authentication */
  secretAccessKey: string;

  /** S3 bucket name */
  bucket: string;

  /** Optional public URL prefix for accessing files */
  publicUrl?: string;
}

/**
 * Async module options for dynamic configuration
 */
export interface StorageModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  /** Whether to make the module globally available */
  isGlobal?: boolean;

  /** Factory function to create the configuration */
  useFactory: (...args: any[]) => Promise<StorageConfig> | StorageConfig;

  /** Dependencies to inject into the factory function */
  inject?: any[];
}
