import { Expose, Type } from 'class-transformer';

// cache to ensure same class reference for same DTO
const apiResponseDtoCache = new Map<new () => unknown, new () => unknown>();

export function ApiResponseDTO<T>(dtoClass: new () => T) {
  // return cached class if exists
  if (apiResponseDtoCache.has(dtoClass)) {
    return apiResponseDtoCache.get(dtoClass) as new () => {
      success: boolean;
      message: string;
      createdItem?: T;
      item?: T;
      items?: T[];
    };
  }

  class ApiResponseClass {
    @Expose()
    success: boolean;

    @Expose()
    message: string;

    @Expose()
    @Type(() => dtoClass)
    createdItem?: T;

    @Expose()
    @Type(() => dtoClass)
    item?: T;

    @Expose()
    @Type(() => dtoClass)
    items?: T[] = []; // default empty array
  }

  // cache and return
  apiResponseDtoCache.set(dtoClass, ApiResponseClass);
  return ApiResponseClass;
}
