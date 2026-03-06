import { Expose, Type } from 'class-transformer';

export class GoalDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  isCompleted: boolean;

  @Expose()
  title: string;

  @Expose()
  parentId: string;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;

  @Expose()
  @Type(() => GoalDto)
  children: GoalDto[];
}
