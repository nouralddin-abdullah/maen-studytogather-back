import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const updateUserSchema = z
  .object({
    username: z.string().min(3).max(23),
    nickName: z.string().min(2).max(50),
  })
  .partial();

export class UpdateUserDTO extends createZodDto(updateUserSchema) {}
