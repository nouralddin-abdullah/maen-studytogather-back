import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { Field, Sex } from '@shared/types';

const updateUserSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores',
      ),
    nickName: z
      .string()
      .min(2, 'Nickname must be at least 2 characters')
      .max(50, 'Nickname must be at most 50 characters'),
    timezone: z.string().optional(),
    country: z
      .string()
      .length(2, 'Country must be a 2-character ISO code')
      .toUpperCase()
      .nullable(),
    gender: z
      .enum(Sex, { message: 'Gender must be male or female' })
      .nullable(),
    field: z
      .enum(Field, { message: 'Field must be one of the available fields' })
      .nullable(),
    quote: z
      .string()
      .max(200, 'Quote must be at most 200 characters')
      .nullable(),
    interests: z.preprocess(
      (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string')
          return val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return val;
      },
      z
        .array(z.string().max(50))
        .max(10, 'You can have at most 10 interests')
        .nullable(),
    ),
    discordUsername: z
      .string()
      .max(50, 'Discord username must be at most 50 characters')
      .nullable(),
    twitterUrl: z.string().url('Must be a valid URL').nullable(),
  })
  .partial();

export class UpdateUserDTO extends createZodDto(updateUserSchema) {}
