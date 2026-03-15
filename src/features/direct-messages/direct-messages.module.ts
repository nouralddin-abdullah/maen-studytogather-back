import { Module } from '@nestjs/common';
import { DirectMessagesService } from './services/direct-messages.service';
import { DirectMessagesController } from './controllers/direct-messages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectMessage } from './entities/direct-message.entity';
import { FriendshipsModule } from '@features/friendships';

@Module({
  imports: [TypeOrmModule.forFeature([DirectMessage]), FriendshipsModule],
  providers: [DirectMessagesService],
  controllers: [DirectMessagesController],
})
export class DirectMessagesModule {}
