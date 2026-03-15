import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FriendshipStatus } from '../enums/friendship-status.enum';

const respondFriendRequestSchema = z.object({
  status: z.enum([FriendshipStatus.ACCEPTED, FriendshipStatus.REJECTED], {
    message: 'Status must be either accepted or rejected',
  }),
});

export class RespondFriendRequestDto extends createZodDto(
  respondFriendRequestSchema,
) {}
