import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const loginUserSchema = z.object({
  // can be email or username (being detected at service)
  loginIdentifier: z
    .string()
    .min(1, 'Email or username is required')
    .max(100, 'Invalid identifier'),
  password: z.string().min(1, 'Password is required'),
});

export class LoginUserDto extends createZodDto(loginUserSchema) {}
