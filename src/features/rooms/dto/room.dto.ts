import { Expose, Type } from 'class-transformer';
import { AmbientSound, RoomTheme, TimerPhase } from '../enums/rooms.enums';

export class RoomHostDTO {
  @Expose()
  username: string;

  @Expose()
  nickName: string;

  @Expose()
  avatar: string;
}

export class RoomDTO {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  theme: RoomTheme;

  @Expose()
  currentNumParticipents: number;

  @Expose()
  ambientSound: AmbientSound;

  @Expose()
  isPublic: boolean;

  @Expose()
  wallPaperUrl: string;

  @Expose()
  inviteCode: string;

  @Expose()
  maxCapacity: number;

  @Expose()
  focusDuration: number;

  @Expose()
  breakDuration: number;

  @Expose()
  hasPassCode: boolean;

  @Expose()
  currentPhase: TimerPhase;

  @Expose()
  hostId: string;

  @Expose()
  @Type(() => RoomHostDTO)
  host: RoomHostDTO;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
