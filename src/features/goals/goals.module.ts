import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from './entities/goal.entity';
import { UsersModule } from '@features/users';
import { StudySession } from '@features/rooms/entities/study-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Goal, StudySession]), UsersModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
