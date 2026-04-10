import { secrets } from '@core/config';
import { PresenceService } from '@features/presence/presence.service';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatMessage } from '@shared/types/chat.types';
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import { RoomsService } from '../services/rooms.service';

/**
 * Merged Room Gateway — handles room events + chat over a single WebSocket.
 *
 * Replaces:
 *  - SSE `@Sse('sse/:roomId')` endpoint (room events, presence, heartbeat)
 *  - `/api/room-chat` WebSocket gateway (chat messages, typing)
 *
 * Namespace: /api/room
 *
 * Client flow:
 *  1. Connect with JWT in `handshake.auth.token`
 *  2. Emit `join_room` with `{ roomId }`
 *  3. Listen for `room_event`, `new_message`, `user_typing`, `connected`
 *  4. Emit `send_message`, `typing`, `leave_room`
 */
@WebSocketGateway({
  namespace: '/api/room',
  cors: {
    origin: secrets.corsOrigin.split(','),
    credentials: true,
  },
})
export class RoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomGateway.name);

  // Chat history per room (same as old gateway)
  private readonly roomChats = new Map<string, ChatMessage[]>();
  private readonly MAX_MESSAGES = 50;

  // Presence heartbeat intervals per client
  private readonly heartbeatIntervals = new Map<string, NodeJS.Timeout>();

  // EventEmitter2 listeners per room (one listener per room, shared by all clients)
  private readonly activeRoomListeners = new Map<
    string,
    { listener: (...args: any[]) => void; clientCount: number }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly roomsService: RoomsService,
    private readonly presenceService: PresenceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  afterInit() {
    this.logger.log('RoomGateway initialized — namespace: /api/room');
  }

  // ──────────────────────────────────────────────────────────────
  // Connection lifecycle
  // ──────────────────────────────────────────────────────────────

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

      // Attach user data to socket (same pattern as dm-chat and room-chat gateways)
      client['user'] = {
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
        role: payload.role,
      };

      this.logger.log(`Client connected: ${payload.username} (${client.id})`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt — disconnecting`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client['user'];
    const roomId = client['roomId'] as string | undefined;

    if (!user) return;

    // Clear presence heartbeat
    const heartbeat = this.heartbeatIntervals.get(client.id);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatIntervals.delete(client.id);
    }

    // Broadcast typing=false on disconnect (same as old chat gateway)
    if (roomId) {
      client.broadcast.to(`room:${roomId}`).emit('user_typing', {
        username: user.username,
        isTyping: false,
      });

      // Unsubscribe from room events if this was the last client in the room
      this.decrementRoomListener(roomId);
    }

    // Handle user disconnect (close study session, decrement participants, set offline)
    if (user.userId) {
      this.roomsService.handleUserDisconnect(user.userId);
      this.presenceService.setOffline(user.userId).catch((err) => {
        this.logger.error(
          `[Presence] Failed to set user ${user.userId} offline:`,
          err,
        );
      });
    }

    this.logger.log(`Client disconnected: ${user.username} (${client.id})`);
  }

  // ──────────────────────────────────────────────────────────────
  // Room Events (replaces SSE)
  // ──────────────────────────────────────────────────────────────

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomId') roomId: string,
  ) {
    const user = client['user'];
    if (!user || !roomId) return;

    // Leave previous room if any
    const previousRoom = client['roomId'] as string | undefined;
    if (previousRoom && previousRoom !== roomId) {
      client.leave(`room:${previousRoom}`);
      this.decrementRoomListener(previousRoom);
    }

    // Join Socket.IO room
    client.join(`room:${roomId}`);
    client['roomId'] = roomId;

    // Look up room data for presence
    const room = await this.roomsService.findOne(roomId);
    if (!room) {
      client.emit('room_error', { message: 'Room not found' });
      return;
    }

    const roomData = {
      roomId: room.id,
      roomName: room.name,
      inviteCode: room.inviteCode,
    };

    // Set user online in Redis
    this.presenceService.setOnline(user.userId, roomData).catch((err) => {
      this.logger.error(
        `[Presence] Failed to set user ${user.userId} online:`,
        err,
      );
    });

    // Start presence heartbeat (refresh every 30s, same as old SSE)
    const existingHeartbeat = this.heartbeatIntervals.get(client.id);
    if (existingHeartbeat) clearInterval(existingHeartbeat);

    const heartbeat = setInterval(() => {
      this.presenceService.setOnline(user.userId, roomData).catch((err) => {
        this.logger.error(
          `[Presence] Failed to refresh user ${user.userId}:`,
          err,
        );
      });
    }, 30_000);
    this.heartbeatIntervals.set(client.id, heartbeat);

    // Subscribe to EventEmitter2 room events and relay to Socket.IO room
    this.ensureRoomListener(roomId);

    // Send initial connection event (same as SSE CONNECTED event)
    client.emit('connected', { roomId });

    // Send chat history
    const history = this.roomChats.get(roomId) || [];
    client.emit('chat_history', history);

    this.logger.log(
      `User ${user.username} joined room ${room.name} (${roomId})`,
    );
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const user = client['user'];
    const roomId = client['roomId'] as string | undefined;

    if (!user || !roomId) return;

    // Clear heartbeat
    const heartbeat = this.heartbeatIntervals.get(client.id);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatIntervals.delete(client.id);
    }

    // Leave Socket.IO room
    client.leave(`room:${roomId}`);
    this.decrementRoomListener(roomId);
    client['roomId'] = undefined;

    // Set offline
    this.presenceService.setOffline(user.userId).catch((err) => {
      this.logger.error(
        `[Presence] Failed to set user ${user.userId} offline:`,
        err,
      );
    });

    this.logger.log(`User ${user.username} left room ${roomId}`);
  }

  // ──────────────────────────────────────────────────────────────
  // Chat (same logic as old room.chat.gateway.ts)
  // ──────────────────────────────────────────────────────────────

  @SubscribeMessage('send_message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      text: string;
      avatar?: string;
    },
  ) {
    const user = client['user'];
    const roomId = client['roomId'] as string | undefined;

    if (!user || !roomId || !payload?.text) return;

    const newMessage: ChatMessage = {
      id: randomUUID(),
      userId: user.userId,
      username: user.username,
      avatar: payload.avatar,
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

    this.server.to(`room:${roomId}`).emit('new_message', newMessage);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { isTyping: boolean },
  ) {
    const user = client['user'];
    const roomId = client['roomId'] as string | undefined;

    if (!roomId || !user) return;

    client.broadcast.to(`room:${roomId}`).emit('user_typing', {
      username: user.username,
      isTyping: payload.isTyping,
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Internal: EventEmitter2 → Socket.IO bridge
  // ──────────────────────────────────────────────────────────────

  /**
   * Ensures a single EventEmitter2 listener exists per room.
   * When room events fire (USER_JOINED, PHASE_CHANGED, etc.),
   * they are relayed to all Socket.IO clients in that room.
   */
  private ensureRoomListener(roomId: string): void {
    const existing = this.activeRoomListeners.get(roomId);
    if (existing) {
      existing.clientCount++;
      return;
    }

    const listener = (data: any) => {
      this.server.to(`room:${roomId}`).emit('room_event', data);
    };

    this.eventEmitter.on(`room.updated.${roomId}`, listener);
    this.activeRoomListeners.set(roomId, { listener, clientCount: 1 });
  }

  /**
   * Decrements the client count for a room's EventEmitter2 listener.
   * When no clients remain, the listener is removed to prevent leaks.
   */
  private decrementRoomListener(roomId: string): void {
    const entry = this.activeRoomListeners.get(roomId);
    if (!entry) return;

    entry.clientCount--;
    if (entry.clientCount <= 0) {
      this.eventEmitter.off(`room.updated.${roomId}`, entry.listener);
      this.activeRoomListeners.delete(roomId);
    }
  }
}
