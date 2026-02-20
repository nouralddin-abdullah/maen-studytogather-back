import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const resetPasswordDto = z.object({
  token: z.string(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(50, 'Password must be at most 50 characters'),
});

export class ResetPasswordDto extends createZodDto(resetPasswordDto) {}
