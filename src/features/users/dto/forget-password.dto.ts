import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const forgetPasswordDto = z.object({
  email: z.string().email(),
});

export class ForgetPasswordDto extends createZodDto(forgetPasswordDto) {}
