import { Expose } from 'class-transformer';
import { AmbientSound, RoomTheme } from '../enums/rooms.enums';

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
  hostId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
