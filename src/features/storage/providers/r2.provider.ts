import { S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { BaseS3Provider } from './base-s3.provider';
import type { StorageConfig } from '../interfaces/storage-config.interface';

/**
 * Cloudflare R2 storage provider
 * R2 is S3-compatible but requires specific configuration
 */
@Injectable()
export class R2Provider extends BaseS3Provider {
  constructor(config: StorageConfig) {
    super(config);
  }

  protected createClient(): S3Client {
    if (!this.config.endpoint) {
      throw new Error(
        'R2 requires an endpoint URL (e.g., https://<account-id>.r2.cloudflarestorage.com)',
      );
    }

    return new S3Client({
      region: 'auto', // R2 uses 'auto' for region
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    // R2 doesn't have a default public URL format
    // You must configure a custom domain or use presigned URLs
    throw new Error(
      'R2 requires a publicUrl configuration for public access. ' +
        'Set STORAGE_PUBLIC_URL or use getPresignedUrl() instead.',
    );
  }
}
