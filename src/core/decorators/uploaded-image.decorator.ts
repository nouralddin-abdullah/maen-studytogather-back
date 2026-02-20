import {
  applyDecorators,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

// default configs
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5mb
const DEFAULT_IMAGE_TYPES = /^image\/(jpeg|png|gif|webp)$/;

export interface UploadedImageOptions {
  // if the file required in the request? default is true
  required?: boolean;
  // max file size in bytes default is 5mb
  maxSize?: number;
  // Allowed MIME types as regex (default: jpeg, png, gif, webp)
  fileType?: RegExp;
  // custom message error if needed for > size
  maxSizeMessage?: string;
  // custom message error if needed for wrong file type
  fileTypeMessage?: string;
}

/**
 * opener decorator that combines FileInterceptor with validation
 * usage: @ImageUpload('fieldName', { required: false, maxSize: 2 * 1024 * 1024 })
 */
export function ImageUpload(fieldName: string, options?: UploadedImageOptions) {
  return applyDecorators(UseInterceptors(FileInterceptor(fieldName)));
}

/**
 * inspector decorator for extracting and validating uploaded image
 * usage: @UploadedImage({ required: false, maxSize: 2 * 1024 * 1024 }) file?: Express.Multer.File
 */
export function UploadedImage(options?: UploadedImageOptions) {
  const {
    required = true,
    maxSize = DEFAULT_MAX_SIZE,
    fileType = DEFAULT_IMAGE_TYPES,
    maxSizeMessage,
    fileTypeMessage,
  } = options || {};

  return UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({
          maxSize,
          message:
            maxSizeMessage || `File must be less than ${formatBytes(maxSize)}`,
        }),
        new FileTypeValidator({
          fileType,
          ...(fileTypeMessage && { message: fileTypeMessage }),
        }),
      ],
      fileIsRequired: required,
    }),
  );
}

// helper function to format sizes in readable formats
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// pre defined file types for suggestions
export const FileTypes = {
  IMAGES: /^image\/(jpeg|png|gif|webp)$/,
  IMAGES_WITH_SVG: /^image\/(jpeg|png|gif|webp|svg\+xml)$/,
  DOCUMENTS:
    /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
  ALL_IMAGES: /^image\/.+$/,
} as const;

// pre calculated file sizes - calc
export const FileSizes = {
  KB: (n: number) => n * 1024,
  MB: (n: number) => n * 1024 * 1024,
  GB: (n: number) => n * 1024 * 1024 * 1024,
} as const;
