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
import { USER_STATS_QUEUE } from '@features/users/constants/user-stats.constants';
import { PresenceModule } from '@features/presence/presence.module';
import { LiveKitService } from './services/livekit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, StudySession]),
    UsersModule,
    BullModule.registerQueue(
      { name: ROOM_TIMER_QUEUE },
      { name: USER_STATS_QUEUE },
    ),
    PresenceModule,
  ],
  providers: [RoomsService, RoomTimerProcessor, LiveKitService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
