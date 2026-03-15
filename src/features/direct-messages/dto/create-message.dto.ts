import { createZodDto } from 'nestjs-zod';
import z, { uuid } from 'zod';

const createMessageSchema = z.object({
  receiverId: uuid({ message: 'ReceiverId must be and UUID' }),
  text: z
    .string()
    .min(1, 'Minimum characters for message is 1')
    .max(5000, 'Maximum characters for message is 5000'),
  replyToId: uuid({
    message: 'Message you are replying to must be UUID',
  }).nullish(),
});

export class CreateMessageDto extends createZodDto(createMessageSchema) {}
