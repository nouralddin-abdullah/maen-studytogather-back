import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const updatePasswordDto = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(50),
});

export class UpdatePasswordDto extends createZodDto(updatePasswordDto) {}
