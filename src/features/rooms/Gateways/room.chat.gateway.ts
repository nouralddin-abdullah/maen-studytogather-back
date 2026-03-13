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
import { ChatMessage } from '@shared/types/chat.types';
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/api/room-chat',
  cors: {
    origin: secrets.frontendUrl || 'https://shell.maen.fun',
    credentials: true,
  },
})
export class RoomChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly roomChats = new Map<string, ChatMessage[]>();
  private readonly MAX_MESSAGES = 50; // keeping 50 messages before deleting from tail.

  constructor(private readonly jwtService: JwtService) {}
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwtService.verifyAsync(token, {
        secret: secrets.jwtSecret,
      });
      client['user'] = payload;
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client['user'];
    const roomId = client['roomId'];

    if (user && roomId) {
      client.broadcast.to(roomId).emit('user_typing', {
        username: user.username,
        isTyping: false,
      });
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomId') roomId: string,
  ) {
    client.join(roomId);

    client['roomId'] = roomId;
    const history = this.roomChats.get(roomId) || [];

    client.emit('chat_history', history);

    console.log(`[ROOM CHAT TEST], Client ${client.id} join room ${roomId}`);
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      text: string;
      avatar?: string;
    },
  ) {
    const { text, avatar } = payload;
    const user = client['user'];
    const roomId = client['roomId'];
    const newMessage: ChatMessage = {
      id: randomUUID(),
      userId: user.sub,
      username: user.username,
      avatar,
      text: payload.text,
      timestamp: Date.now(),
    };

    if (!this.roomChats.has(roomId)) {
      this.roomChats.set(roomId, []);
    }

    const messages = this.roomChats.get(roomId)!;
    messages.push(newMessage);

    if (messages.length > this.MAX_MESSAGES) {
      messages.shift();
    }

    this.server.to(roomId).emit('new_message', newMessage);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { isTyping: boolean },
  ) {
    const user = client['user'];
    const roomId = client['roomId'];

    if (!roomId || !user) return;

    client.broadcast.to(roomId).emit('user_typing', {
      username: user.username,
      isTyping: payload.isTyping,
    });
  }
}
