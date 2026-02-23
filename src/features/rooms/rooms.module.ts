import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Room } from './entities/room.entity';
import { RoomsService } from './services/rooms.service';
import { RoomsController } from './controllers/rooms.controller';
import { StudySession } from './entities/study-session.entity';
import { UsersModule } from '@features/users';
import { ROOM_TIMER_QUEUE } from './constants/rooms.constants';
import { RoomTimerProcessor } from './services/room-timer.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room]),
    TypeOrmModule.forFeature([StudySession]),
    UsersModule,
    BullModule.registerQueue({ name: ROOM_TIMER_QUEUE }),
  ],
  providers: [RoomsService, RoomTimerProcessor],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
