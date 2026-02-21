import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),

  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),

  sortBy: z.string().optional().default('currentNumParticipents'),

  order: z.enum(['asc', 'desc']).optional().default('desc'),

  search: z.string().optional(),
});

export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}

// type helper can be user in controller to get query pagination data
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
