import { createZodDto } from 'nestjs-zod';
import z, { uuid } from 'zod';

const updateMessageSchema = z
  .object({
    text: z
      .string()
      .min(1, 'Minimum characters for message is 1')
      .max(5000, 'Maximum characters for message is 5000'),
  })
  .partial();

export class UpdateMessageDto extends createZodDto(updateMessageSchema) {}
