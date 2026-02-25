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
  gender: Sex;

  @Expose()
  quote: string | null;

  @Expose()
  interests: string[] | null;

  @Expose()
  profileBackgroundUrl: string | null;

  @Expose()
  sessionsCount: number;

  @Expose()
  totalFocusMinutes: number;

  @Expose()
  timezone: string;

  @Expose()
  discordUsername: string | null;

  @Expose()
  twitterUrl: string | null;

  @Expose()
  currentStreak: number;

  @Expose()
  longestStreak: number;

  @Expose()
  createdAt: Date;
}
