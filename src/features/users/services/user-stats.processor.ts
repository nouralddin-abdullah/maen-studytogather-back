import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  SessionCompletedJobPayload,
  USER_STATS_QUEUE,
} from '../constants/user-stats.constants';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { User } from '../entities';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

@Processor(USER_STATS_QUEUE)
@Injectable()
export class UserStatsProcessor extends WorkerHost {
  private readonly logger = new Logger(UserStatsProcessor.name);

  // Notice we inject DataSource instead of specific Repositories.
  // We need the raw DataSource to manually control Database Transactions!
  constructor(
    private dataSource: DataSource,
    private leaderboardService: LeaderboardService,
  ) {
    super();
  }

  async process(job: Job<SessionCompletedJobPayload>) {
    const { userId, earnedMinutes, incrementSession } = job.data;

    if (earnedMinutes <= 0 && !incrementSession) {
      return; // Nothing to update!
    }

    // 1. Open a Dedicated Database Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. The Pessimistic Lock!
      // This tells PostgreSQL: "Lock this user row. If another BullMQ job tries to
      // update this user at the exact same millisecond, make it wait in line."
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found for stats processing.`);
        await queryRunner.rollbackTransaction();
        return;
      }

      // 3. Timezone Math: Calculate "Today" in the User's World
      const now = new Date();
      // 'en-CA' forces the format to be a strict YYYY-MM-DD
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: user.timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);

      // 4. The Heatmap Atomic UPSERT (PostgreSQL Magic)
      // We generate the UUID in Node.js to avoid requiring PostgreSQL extensions
      const logId = crypto.randomUUID();
      await queryRunner.manager.query(
        `
        INSERT INTO "daily_study_log" ("id", "userId", "date", "totalMinutes")
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ("userId", "date")
        DO UPDATE SET "totalMinutes" = "daily_study_log"."totalMinutes" + EXCLUDED."totalMinutes"
        `,
        [logId, user.id, todayStr, earnedMinutes],
      );

      // 5. Gamification & Streak Logic
      // TypeORM date columns usually return a string ('YYYY-MM-DD') or a Date object. Let's normalize it.
      const lastStudyStr =
        user.lastStudyDate instanceof Date
          ? user.lastStudyDate.toISOString().split('T')[0]
          : user.lastStudyDate;

      if (!lastStudyStr) {
        // Very first time they have ever studied!
        user.currentStreak = 1;
      } else if (lastStudyStr !== todayStr) {
        // They studied on a previous day. We need to check if it was EXACTLY yesterday.
        // By forcing both strings into UTC midnight, we safely calculate the pure day difference
        const todayDate = new Date(`${todayStr}T00:00:00Z`);
        const lastDate = new Date(`${lastStudyStr}T00:00:00Z`);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          user.currentStreak += 1; // Studied yesterday, streak continues!
        } else if (diffDays > 1) {
          user.currentStreak = 1; // Missed a day, streak broken!
        }
      }

      // Update longest streak if necessary
      if (user.currentStreak > user.longestStreak) {
        user.longestStreak = user.currentStreak;
      }

      // Update their denormalized profile stats
      user.lastStudyDate = todayStr as any;
      user.totalFocusMinutes += earnedMinutes;

      // 6. The Double-Counting Fix!
      if (incrementSession) {
        user.sessionsCount += 1;
      }

      // 7. Save and Commit the Transaction!
      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();

      //update redis leaderboard for the gained earnedMinutes
      if (earnedMinutes > 0) {
        await this.leaderboardService.increamentUserState(
          userId,
          earnedMinutes,
        );
      }
      this.logger.log(
        `Successfully processed stats for user ${userId}. Earned: ${earnedMinutes}m`,
      );
    } catch (error) {
      // If ANYTHING goes wrong (database crash, syntax error), undo all changes immediately
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to process stats for user ${userId}`,
        error.stack,
      );
      throw error; // Let BullMQ know it failed so it can automatically retry later!
    } finally {
      await queryRunner.release();
    }
  }
}
