import { secrets } from '@core/config';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

export interface UserPresenceData {
  status: 'online';
  roomId?: string;
  roomName?: string;
  inviteCode?: string;
}
export interface BulkPresenceResult {
  userId: string;
  isOnline: boolean;
  roomId?: string;
  roomName?: string;
  inviteCode?: string;
}

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PresenceService.name);
  private redisClient: Redis;

  constructor(private eventEmitter: EventEmitter2) {
    this.redisClient = new Redis({
      host: secrets.redis.host,
      port: secrets.redis.port,
      password: secrets.redis.password,
      username: secrets.redis.username,
      lazyConnect: true,
      family: 4,
    });
  }

  async onModuleInit() {
    try {
      await this.redisClient.connect();
      const response = this.redisClient.ping();
      this.logger.log(
        `cloud redis connected successfully! database replied: ${response}`,
      );
    } catch (error) {
      this.logger.error(`Could not connect to Cloud redis.`, error);
    }
  }

  //make a user online at redis
  async setOnline(
    userId: string,
    roomData?: {
      roomId: string;
      roomName: string;
      inviteCode: string;
    },
  ): Promise<void> {
    const presenceObj: UserPresenceData = {
      status: 'online',
      ...roomData,
    };
    const redisString = JSON.stringify(presenceObj);
    await this.redisClient.set(
      `presence:user:${userId}`,
      redisString,
      'EX',
      60,
    );
    this.eventEmitter.emit('user.presence.changed', {
      userId: userId,
      isOnline: true,
      ...roomData,
    });
    this.logger.log(`User ${userId} is now Online`);
  }

  //delete user presedence
  async setOffline(userId: string): Promise<void> {
    await this.redisClient.del(`presence:user:${userId}`);
    this.eventEmitter.emit('user.presence.changed', {
      userId: userId,
      isOnline: false,
    });
    this.logger.log(`User ${userId} went offline`);
  }

  //check if a user is online
  async getPresence(userId: string): Promise<UserPresenceData | null> {
    const redisString = await this.redisClient.get(`presence:user:${userId}`);
    if (!redisString) return null;
    return JSON.parse(redisString) as UserPresenceData;
  }

  async getOnlineStatus(
    userIds: string[],
  ): Promise<(BulkPresenceResult & { userId: string })[]> {
    const checks = userIds.map(async (id) => {
      const presence = await this.getPresence(id);
      return {
        userId: id,
        isOnline: !!presence,
        roomId: presence?.roomId,
        roomName: presence?.roomName,
        inviteCode: presence?.inviteCode,
      };
    });
    return Promise.all(checks);
  }

  async onModuleDestroy() {
    this.logger.log(`Disconnecting from cloud Redis...`);
    this.redisClient.quit();
  }
}
