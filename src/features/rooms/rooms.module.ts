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
import { RoomChatGateway } from './Gateways/room.chat.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, StudySession]),
    UsersModule,
    BullModule.registerQueue(
      { name: ROOM_TIMER_QUEUE },
      { name: USER_STATS_QUEUE },
    ),
    PresenceModule,
    JwtModule,
  ],
  providers: [
    RoomsService,
    RoomTimerProcessor,
    LiveKitService,
    RoomChatGateway,
  ],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
