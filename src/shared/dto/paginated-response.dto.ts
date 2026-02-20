import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class PaginationMeta {
  @Expose()
  @ApiProperty({ example: 1 })
  currentPage: number;

  @Expose()
  @ApiProperty({ example: 10 })
  itemsPerPage: number;

  @Expose()
  @ApiProperty({ example: 100 })
  totalItems: number;

  @Expose()
  @ApiProperty({ example: 10 })
  totalPages: number;

  @Expose()
  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @Expose()
  @ApiProperty({ example: false })
  hasPreviousPage: boolean;
}

// cache to ensure same class reference for same DTO -> prevents swagger meta data issues
const paginatedDtoCache = new Map<new () => unknown, new () => unknown>();

/**
 * Factory function to create a typed PaginatedResponseDto class
 * This enables proper serialization with class-transformer
 * Uses memoization to return the same class reference for the same DTO
 *
 * @example
 * // In your controller:
 * @Serialize(PaginatedResponseDTO(UserDto))
 * @Get()
 * async findAll(@Query() query: PaginationQueryDto) {
 *   return this.usersService.findAll(query);
 * }
 */
export function PaginatedResponseDTO<T>(dtoClass: new () => T) {
  // return cached class if exists
  if (paginatedDtoCache.has(dtoClass)) {
    return paginatedDtoCache.get(dtoClass) as new () => {
      data: T[];
      meta: PaginationMeta;
    };
  }

  class PaginatedResponseClass {
    @Expose()
    @Type(() => dtoClass)
    @ApiProperty({ type: [dtoClass] })
    data: T[] = []; // default empty array to handle edge case

    @Expose()
    @Type(() => PaginationMeta)
    @ApiProperty({ type: PaginationMeta })
    meta: PaginationMeta;
  }

  // cache and return
  paginatedDtoCache.set(dtoClass, PaginatedResponseClass);
  return PaginatedResponseClass;
}

// type helper for service return type
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Helper function to create paginated response data
 *
 * @example
 * // In your service:
 * async findAll(query: PaginationQuery): Promise<PaginatedResponse<User>> {
 *   const [users, total] = await this.userRepository.findAndCount({
 *     skip: (query.page - 1) * query.limit,
 *     take: query.limit,
 *   });
 *   return createPaginatedResponse(users, total, query.page, query.limit);
 * }
 */
export function createPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    meta: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
