import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores',
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(50, 'Password must be at most 50 characters'),
  nickName: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(50, 'Nickname must be at most 50 characters'),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
