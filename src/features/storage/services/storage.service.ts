import { Injectable, Inject } from '@nestjs/common';
import { STORAGE_PROVIDER } from '../constants/storage.constants';
import type {
  IStorageProvider,
  UploadOptions,
  UploadResult,
  GetObjectOptions,
  GetObjectResult,
  DeleteOptions,
  PresignedUrlOptions,
  PresignedUploadOptions,
  ListOptions,
  ListResult,
} from '../interfaces/storage-provider.interface';
import * as StorageInterfaces from '../interfaces/storage-provider.interface';

/**
 * Storage service facade
 * Provides a clean interface for storage operations
 * Delegates to the configured storage provider (S3 or R2)
 */
@Injectable()
export class StorageService implements IStorageProvider {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: StorageInterfaces.IStorageProvider,
  ) {}

  /**
   * Upload a file to storage
   * @param options Upload options including key, body, and metadata
   * @returns Upload result with key and URL
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    return this.provider.upload(options);
  }

  /**
   * Get a file from storage
   * @param options Get options including the key
   * @returns The file content and metadata
   */
  async get(options: GetObjectOptions): Promise<GetObjectResult> {
    return this.provider.get(options);
  }

  /**
   * Delete a file from storage
   * @param options Delete options including the key
   */
  async delete(options: DeleteOptions): Promise<void> {
    return this.provider.delete(options);
  }

  /**
   * Generate a presigned URL for downloading a file
   * @param options Presigned URL options
   * @returns The presigned download URL
   */
  async getPresignedUrl(options: PresignedUrlOptions): Promise<string> {
    return this.provider.getPresignedUrl(options);
  }

  /**
   * Generate a presigned URL for uploading a file
   * @param options Presigned upload options
   * @returns The presigned upload URL
   */
  async getPresignedUploadUrl(
    options: PresignedUploadOptions,
  ): Promise<string> {
    return this.provider.getPresignedUploadUrl(options);
  }

  /**
   * List objects in storage
   * @param options List options for filtering and pagination
   * @returns List of objects and pagination info
   */
  async list(options?: ListOptions): Promise<ListResult> {
    return this.provider.list(options);
  }

  /**
   * Check if an object exists in storage
   * @param key The object key to check
   * @returns True if the object exists
   */
  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  /**
   * Get the full public URL of an object
   * @param key The object key
   * @returns The public URL
   */
  getPublicUrl(key: string): string {
    return this.provider.getPublicUrl(key);
  }
}
