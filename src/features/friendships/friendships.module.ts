import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PresenceModule } from '@features/presence/presence.module';
import { Friendship } from './entities/friendship.entity';
import { FriendshipsController } from './controllers/friendships.controller';
import { FriendshipsService } from './services/friendships.service';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship]), PresenceModule],
  controllers: [FriendshipsController],
  providers: [FriendshipsService],
  exports: [FriendshipsService],
})
export class FriendshipsModule {}
