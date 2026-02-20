import { Readable } from 'stream';

/**
 * Options for uploading a file
 */
export interface UploadOptions {
  /** The key (path) where the file will be stored */
  key: string;
  /** The file content as Buffer, Readable stream, or string */
  body: Buffer | Readable | string;
  /** MIME type of the file */
  contentType?: string;
  /** Custom metadata to attach to the file */
  metadata?: Record<string, string>;
  /** Access control list setting */
  acl?: 'private' | 'public-read';
}

/**
 * Result of an upload operation
 */
export interface UploadResult {
  /** The key where the file was stored */
  key: string;
  /** The public URL of the uploaded file */
  url: string;
  /** ETag of the uploaded file */
  etag?: string;
}

/**
 * Options for getting a file
 */
export interface GetObjectOptions {
  /** The key (path) of the file to retrieve */
  key: string;
}

/**
 * Result of a get operation
 */
export interface GetObjectResult {
  /** The file content as a readable stream */
  body: Readable;
  /** MIME type of the file */
  contentType?: string;
  /** Size of the file in bytes */
  contentLength?: number;
  /** Custom metadata attached to the file */
  metadata?: Record<string, string>;
}

/**
 * Options for deleting a file
 */
export interface DeleteOptions {
  /** The key (path) of the file to delete */
  key: string;
}

/**
 * Options for generating a presigned download URL
 */
export interface PresignedUrlOptions {
  /** The key (path) of the file */
  key: string;
  /** Expiration time in seconds (default: 3600) */
  expiresIn?: number;
}

/**
 * Options for generating a presigned upload URL
 */
export interface PresignedUploadOptions {
  /** The key (path) where the file will be uploaded */
  key: string;
  /** Expected MIME type of the upload */
  contentType?: string;
  /** Expiration time in seconds (default: 3600) */
  expiresIn?: number;
}

/**
 * Options for listing objects
 */
export interface ListOptions {
  /** Prefix to filter objects by path */
  prefix?: string;
  /** Maximum number of objects to return */
  maxKeys?: number;
  /** Continuation token for pagination */
  continuationToken?: string;
}

/**
 * Result of a list operation
 */
export interface ListResult {
  /** Array of objects found */
  objects: {
    /** Object key (path) */
    key: string;
    /** Object size in bytes */
    size: number;
    /** Last modification date */
    lastModified?: Date;
  }[];
  /** Token for fetching the next page */
  continuationToken?: string;
  /** Whether there are more results */
  isTruncated: boolean;
}

/**
 * Interface for storage provider implementations
 * Defines the contract for upload, download, and management operations
 */
export interface IStorageProvider {
  /**
   * Upload a file to storage
   * @param options Upload options including key, body, and metadata
   * @returns Upload result with key and URL
   */
  upload(options: UploadOptions): Promise<UploadResult>;

  /**
   * Get a file from storage
   * @param options Get options including the key
   * @returns The file content and metadata
   */
  get(options: GetObjectOptions): Promise<GetObjectResult>;

  /**
   * Delete a file from storage
   * @param options Delete options including the key
   */
  delete(options: DeleteOptions): Promise<void>;

  /**
   * Generate a presigned URL for downloading a file
   * @param options Presigned URL options
   * @returns The presigned download URL
   */
  getPresignedUrl(options: PresignedUrlOptions): Promise<string>;

  /**
   * Generate a presigned URL for uploading a file
   * @param options Presigned upload options
   * @returns The presigned upload URL
   */
  getPresignedUploadUrl(options: PresignedUploadOptions): Promise<string>;

  /**
   * List objects in storage
   * @param options List options for filtering and pagination
   * @returns List of objects and pagination info
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Check if an object exists in storage
   * @param key The object key to check
   * @returns True if the object exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get the full public URL of an object
   * @param key The object key
   * @returns The public URL
   */
  getPublicUrl(key: string): string;
}
