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
import { RoomGateway } from './Gateways/room.gateway';
import { JwtModule } from '@nestjs/jwt';
import { Goal } from '@features/goals/entities/goal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, StudySession, Goal]),
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
    RoomChatGateway, // deprecated — kept for backward compat until frontend migrates
    RoomGateway, // new merged gateway (room events + chat) at /api/room
  ],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
