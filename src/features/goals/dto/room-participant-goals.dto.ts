import { Expose, Type } from 'class-transformer';
import { GoalDto } from './Goal.dto';

export class RoomParticipantGoalsDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => GoalDto)
  goals: GoalDto[];
}
