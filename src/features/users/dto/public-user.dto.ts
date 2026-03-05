import { OmitType } from '@nestjs/swagger';
import { UserDTO } from './user.dto';

export class PublicUserDTO extends OmitType(UserDTO, [
  'email',
  'role',
  'timezone',
] as const) {}
