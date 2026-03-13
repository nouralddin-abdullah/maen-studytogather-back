import {
  applyDecorators,
  UseInterceptors,
  UploadedFile,
  UploadedFiles as NestUploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileValidator,
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';

// default configs
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5mb
const DEFAULT_IMAGE_TYPES = /^image\/(jpeg|jpg|png|gif|webp)$/i;

interface MimeTypeValidatorOptions {
  fileType: RegExp;
  currentType?: string;
}

class MimeTypeValidator extends FileValidator<MimeTypeValidatorOptions> {
  buildErrorMessage(): string {
    return `Validation failed (current file type is ${this.validationOptions.currentType || 'unknown'}, expected type is ${this.validationOptions.fileType})`;
  }

  isValid(file?: Express.Multer.File): boolean {
    const normalizedMimeType = normalizeMimeType(file?.mimetype);
    this.validationOptions.currentType = normalizedMimeType || 'unknown';
    return testMimeType(normalizedMimeType, this.validationOptions.fileType);
  }
}

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

export interface MultiImageField {
  // form field name
  name: string;
  // max number of files for this field (default: 1)
  maxCount?: number;
}

/**
 * opener decorator that combines FileFieldsInterceptor for multiple file fields
 * usage: @MultiImageUpload([{ name: 'avatar' }, { name: 'background' }])
 */
export function MultiImageUpload(fields: MultiImageField[]) {
  return applyDecorators(
    UseInterceptors(
      FileFieldsInterceptor(
        fields.map((f) => ({ name: f.name, maxCount: f.maxCount ?? 1 })),
      ),
    ),
  );
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
        new MimeTypeValidator({
          fileType,
          ...(fileTypeMessage && { message: fileTypeMessage }),
        }),
      ],
      fileIsRequired: required,
    }),
  );
}

export interface UploadedImagesField {
  // form field name
  name: string;
  // if this file is required (default: false)
  required?: boolean;
  // max file size in bytes (default: 5mb)
  maxSize?: number;
  // Allowed MIME types as regex (default: jpeg, png, gif, webp)
  fileType?: RegExp;
}

/**
 * inspector decorator for extracting and validating multiple uploaded images
 * usage: @UploadedImages([{ name: 'avatar', maxSize: FileSizes.MB(5) }, { name: 'background' }])
 * returns: Record<string, Express.Multer.File | undefined>
 */
export function UploadedImages(fields: UploadedImagesField[]) {
  return createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const files: Record<string, Express.Multer.File[]> = req.files || {};
    const result: Record<string, Express.Multer.File | undefined> = {};

    for (const field of fields) {
      const {
        name,
        required = false,
        maxSize = DEFAULT_MAX_SIZE,
        fileType = DEFAULT_IMAGE_TYPES,
      } = field;

      const file = files[name]?.[0];

      if (!file && required) {
        throw new BadRequestException(`File '${name}' is required`);
      }

      if (file) {
        if (file.size > maxSize) {
          throw new BadRequestException(
            `File '${name}' must be less than ${formatBytes(maxSize)}`,
          );
        }
        if (!testMimeType(file.mimetype, fileType)) {
          throw new BadRequestException(
            `File '${name}' has an invalid file type`,
          );
        }
      }

      result[name] = file;
    }

    return result;
  })();
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
  IMAGES: /^image\/(jpeg|jpg|png|gif|webp)$/i,
  IMAGES_WITH_SVG: /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/i,
  DOCUMENTS:
    /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
  ALL_IMAGES: /^image\/.+$/i,
} as const;

// pre calculated file sizes - calc
export const FileSizes = {
  KB: (n: number) => n * 1024,
  MB: (n: number) => n * 1024 * 1024,
  GB: (n: number) => n * 1024 * 1024 * 1024,
} as const;

function normalizeMimeType(mimeType?: string): string {
  if (!mimeType) return '';
  return mimeType.split(';')[0].trim().toLowerCase();
}

function testMimeType(mimeType: string | undefined, fileType: RegExp): boolean {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (!normalizedMimeType) return false;

  // Avoid stateful RegExp flags (`g`, `y`) causing false negatives.
  const safeFlags = fileType.flags.replace(/[gy]/g, '');
  const safeRegex = new RegExp(fileType.source, safeFlags);
  return safeRegex.test(normalizedMimeType);
}
