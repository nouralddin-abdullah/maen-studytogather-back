import { Expose } from 'class-transformer';
import { Role } from '@shared/types';

export class UserDTO {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  nickName: string;

  @Expose()
  avatar: string;

  @Expose()
  role: Role;
}
