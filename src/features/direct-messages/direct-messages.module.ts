import { Module } from '@nestjs/common';
import { DirectMessagesService } from './services/direct-messages.service';
import { DirectMessagesController } from './controllers/direct-messages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectMessage } from './entities/direct-message.entity';
import { FriendshipsModule } from '@features/friendships';
import { JwtModule } from '@nestjs/jwt';
import { DmChatGateway } from './gateways/dm-chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([DirectMessage]),
    FriendshipsModule,
    JwtModule,
  ],
  providers: [DirectMessagesService, DmChatGateway],
  controllers: [DirectMessagesController],
})
export class DirectMessagesModule {}
