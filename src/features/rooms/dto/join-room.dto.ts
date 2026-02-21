import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const joinRoomSchema = z.object({
  passCode: z.string().nullish(),
});

export class JoinRoomDto extends createZodDto(joinRoomSchema) {}
