import { S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { BaseS3Provider } from './base-s3.provider';
import type { StorageConfig } from '../interfaces/storage-config.interface';

/**
 * Amazon S3 storage provider
 * Supports standard S3 and S3-compatible services (MinIO, DigitalOcean Spaces)
 */
@Injectable()
export class S3Provider extends BaseS3Provider {
  constructor(config: StorageConfig) {
    super(config);
  }

  protected createClient(): S3Client {
    return new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      // For custom S3-compatible endpoints (like MinIO)
      ...(this.config.endpoint && {
        endpoint: this.config.endpoint,
        forcePathStyle: true,
      }),
    });
  }

  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    // Default S3 URL format
    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}
