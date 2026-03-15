import { secrets } from '@core/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DirectMessagesService } from '../services/direct-messages.service';
import { FriendshipsService, FriendshipStatus } from '@features/friendships';
import { CreateMessageDto } from '../dto/create-message.dto';
import { randomUUID } from 'crypto';

@WebSocketGateway({
  namespace: '/api/dm-chat',
  cors: {
    origin: secrets.frontendUrl || 'https://shell.maen.fun',
    credentials: true,
  },
})
export class DmChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  constructor(
    private readonly jwtService: JwtService,
    private readonly dmService: DirectMessagesService,
    private readonly friendshipService: FriendshipsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) return client.disconnect();
      const payload = await this.jwtService.verifyAsync(token, {
        secret: secrets.jwtSecret,
      });

      client['user'] = payload;

      client.join(payload.userId);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('send_dm')
  async handleSendDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateMessageDto,
  ) {
    const sender = client['user'];
    if (sender.userId === payload.receiverId) return;

    const friendship = await this.friendshipService.getFriendshipStatus(
      sender.userId,
      payload.receiverId,
    );

    if (friendship.status !== 'FRIENDS') {
      client.emit('dm_error', {
        message: 'You can only message accepted friends.',
      });
      return;
    }

    const messageId = randomUUID();

    const savedMessage = await this.dmService.saveMessage({
      id: messageId,
      senderId: sender.userId,
      receiverId: payload.receiverId,
      text: payload.text,
      replyToId: payload.replyToId,
    });

    const broadcastPayload = {
      ...savedMessage,
      senderData: {
        id: sender.userId,
        username: sender.username,
        avatar: sender.avatar,
      },
    };

    this.server.to(payload.receiverId).emit('receive_dm', broadcastPayload);

    this.server.to(sender.userId).emit('receive_dm', broadcastPayload);
  }

  @SubscribeMessage('edit_dm')
  async handleEditDm(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { messageId: string; newText: string; receiverId: string },
  ) {
    const sender = client['user'];
    try {
      const updatedMessage = await this.dmService.updateMessage(
        sender.userId,
        payload.messageId,
        { text: payload.newText },
      );

      this.server.to(payload.receiverId).emit('dm_edited', updatedMessage);
      this.server.to(sender.userId).emit('dm_edited', updatedMessage);
    } catch (error) {
      client.emit('dm_error', { message: 'Could not edit message.' });
    }
  }

  @SubscribeMessage('typing_dm')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; isTyping: boolean },
  ) {
    const sender = client['user'];

    this.server.to(payload.receiverId).emit('friend_typing', {
      userId: sender.userId,
      isTyping: payload.isTyping,
    });
  }
}
