import { Expose } from 'class-transformer';
import { Role, Sex, Field } from '@shared/types/index';

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

  @Expose()
  field: Field;

  @Expose()
  country: string;

  @Expose()
  longestStreak: number;

  @Expose()
  gender: Sex;
}
