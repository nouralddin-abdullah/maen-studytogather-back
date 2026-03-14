import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { User } from '../entities';
import { In, Repository } from 'typeorm';
import { secrets } from '@core/config';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'overall';

@Injectable()
export class LeaderboardService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaderboardService.name);
  private redisClient: Redis;

  constructor(@InjectRepository(User) private userRepo: Repository<User>) {
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
      this.logger.log('Leaderboard Redis connected successfully');
    } catch (error) {
      this.logger.error(`Couldn't connect to leaderboard redis: ${error}`);
    }
  }

  async onModuleDestroy() {
    this.redisClient.quit();
  }

  // utility to get keys of redis based on current UTC time.
  private getRedisKey(period: LeaderboardPeriod): string {
    if (period === 'overall') return 'leaderboard:overall';
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');

    if (period === 'daily') return `leaderboard:daily:${year}-${month}-${day}`;
    if (period === 'monthly') return `leaderboard:monthly:${year}-${month}`;
    if (period === 'weekly') {
      // getting monday of current UTC
      const dayOfWeek = now.getUTCDay();
      const diff = now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(Date.UTC(year, now.getUTCMonth(), diff));
      return `leaderboard:weekly:${monday.toISOString().split('T')[0]}`;
    }
    return 'leaderboard:overall'; // default is overall anyway
  }

  // method called by BullMQ when studySession finishes
  async increamentUserState(
    userId: string,
    earnedMinutes: number,
  ): Promise<void> {
    if (earnedMinutes <= 0) return;

    const pipeline = this.redisClient.pipeline();

    const dailyKey = this.getRedisKey('daily');
    const weeklyKey = this.getRedisKey('weekly');
    const monthlyKey = this.getRedisKey('monthly');
    const overallKey = this.getRedisKey('overall');

    // adding minutes to all active learboards sim
    pipeline.zincrby(overallKey, earnedMinutes, userId);
    pipeline.zincrby(monthlyKey, earnedMinutes, userId);
    pipeline.zincrby(weeklyKey, earnedMinutes, userId);
    pipeline.zincrby(dailyKey, earnedMinutes, userId);

    pipeline.expire(dailyKey, 172800); // auto delete old keys to save ram;
    pipeline.expire(weeklyKey, 1209600);
    pipeline.expire(monthlyKey, 5184000);

    await pipeline.exec();
    this.logger.debug(
      `Added ${earnedMinutes} mins to leaderboard of User ${userId}`,
    );
  }

  async getLeaderboard(period: LeaderboardPeriod, page: number, limit: number) {
    const redisKey = this.getRedisKey(period);
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    const rawData = await this.redisClient.zrevrange(
      redisKey,
      start,
      stop,
      'WITHSCORES',
    );
    if (rawData.length === 0) {
      return {
        data: [],
        totalItems: await this.redisClient.zcard(redisKey),
      };
    }

    const userScores = new Map<string, number>();
    const userIds: string[] = [];

    for (let i = 0; i < rawData.length; i += 2) {
      const id = rawData[i];
      const score = parseInt(rawData[i + 1], 10);
      userScores.set(id, score);
      userIds.push(id);
    }

    //map ids to user profiles from postgres
    const users = await this.userRepo.find({
      where: { id: In(userIds) },
      select: [
        'id',
        'username',
        'nickName',
        'avatar',
        'field',
        'longestStreak',
      ],
    });

    const sortedLeaderboard = userIds.map((id, index) => {
      const user = users.find((u) => u.id === id);
      return {
        rank: start + index + 1,
        score: userScores.get(id) || 0,
        user: user || { id, username: 'Unknown User' }, // fallback safe if user was soft deleted,
      };
    });
    const totalItems = await this.redisClient.zcard(redisKey);
    return { data: sortedLeaderboard, totalItems };
  }

  //get user rank isntant lookup
  async getUserRank(userId: string, period: LeaderboardPeriod) {
    const redisKey = this.getRedisKey(period);

    const [rankIndex, scoreStr] = await Promise.all([
      this.redisClient.zrevrank(redisKey, userId),
      this.redisClient.zscore(redisKey, userId),
    ]);
    if (rankIndex === null) {
      return { rank: null, score: 0 };
    }
    return {
      rank: rankIndex + 1,
      score: parseInt(scoreStr as string, 10),
    };
  }
}
