import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const sendFriendRequestSchema = z.object({
  addresseeId: z.string().uuid('Invalid user ID format'),
});

export class SendFriendRequestDto extends createZodDto(
  sendFriendRequestSchema,
) {}
