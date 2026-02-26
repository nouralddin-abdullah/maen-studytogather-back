import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import {
  ROOM_TIMER_QUEUE,
  RoomTimerJobName,
} from '../constants/rooms.constants';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { StudySession } from '../entities/study-session.entity';
import { Room } from '../entities/room.entity';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimerPhase } from '../enums/rooms.enums';
import { StudySessionStatus } from '../enums/study-session.enums';
import {
  USER_STATS_QUEUE,
  UserStatsJobName,
} from '@features/users/constants/user-stats.constants';

@Processor(ROOM_TIMER_QUEUE)
@Injectable()
export class RoomTimerProcessor extends WorkerHost {
  private readonly logger = new Logger(RoomTimerProcessor.name);

  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(StudySession)
    private sessionRepo: Repository<StudySession>,
    private eventEmitter: EventEmitter2,
    @InjectQueue(ROOM_TIMER_QUEUE) private roomTimerQueue: Queue,
    @InjectQueue(USER_STATS_QUEUE) private userStatsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ roomId: string; phase: TimerPhase }>) {
    const { roomId, phase } = job.data;
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room || room.currentPhase !== phase) {
      this.logger.debug(
        `Dropped stale job for room ${roomId}. Expected: ${phase}, Actual: ${room?.currentPhase}`,
      );
      return;
    }
    const now = new Date();

    if (phase === TimerPhase.FOCUS) {
      // 1. Calculate Focus Time for everyone!
      const activeSessions = await this.sessionRepo.find({
        where: { roomId, status: StudySessionStatus.ACTIVE },
      });

      for (const session of activeSessions) {
        const startPoint =
          room.phaseStartedAt! > session.joinedAt
            ? room.phaseStartedAt
            : session.joinedAt;
        const earnedMinutes = Math.floor(
          (now.getTime() - startPoint!.getTime()) / 60000,
        );
        if (earnedMinutes > 0) {
          session.totalFocusMinutes =
            (session.totalFocusMinutes || 0) + earnedMinutes;
          await this.userStatsQueue.add(UserStatsJobName.SESSION_COMPLETED, {
            userId: session.userId,
            earnedMinutes: earnedMinutes,
            sessionId: session.id,
            incrementSession: false,
          });
        }
      }
      if (activeSessions.length > 0) {
        await this.sessionRepo.save(activeSessions);
      }

      // 2. Transition Room to BREAK
      room.currentPhase = TimerPhase.BREAK;
      room.phaseStartedAt = now;
      room.timerEndAt = new Date(now.getTime() + room.breakDuration * 60000);
      await this.roomRepo.save(room);

      // 3. Schedule the next job (End of Break)
      await this.roomTimerQueue.add(
        RoomTimerJobName.PHASE_END,
        { roomId, phase: TimerPhase.BREAK },
        {
          delay: room.breakDuration * 60000,
          jobId: `timer-${roomId}-break`,
          removeOnComplete: true,
        },
      );

      this.eventEmitter.emit(`room.updated.${roomId}`, {
        type: 'PHASE_CHANGED',
        payload: {
          phase: TimerPhase.BREAK,
          timerEndAt: room.timerEndAt,
          phaseStartedAt: room.phaseStartedAt,
        },
      });

      this.logger.log(`Room ${roomId} finished FOCUS. Starting BREAK.`);
    } else if (phase === TimerPhase.BREAK) {
      // Transition Room back to FOCUS (No minutes calculated here)
      room.currentPhase = TimerPhase.FOCUS;
      room.phaseStartedAt = now;
      room.timerEndAt = new Date(now.getTime() + room.focusDuration * 60000);
      await this.roomRepo.save(room);

      // Schedule the next job (End of Focus)
      await this.roomTimerQueue.add(
        RoomTimerJobName.PHASE_END,
        { roomId, phase: TimerPhase.FOCUS },
        {
          delay: room.focusDuration * 60000,
          jobId: `timer-${roomId}-focus`,
          removeOnComplete: true,
        },
      );

      this.eventEmitter.emit(`room.updated.${roomId}`, {
        type: 'PHASE_CHANGED',
        payload: {
          phase: TimerPhase.FOCUS,
          timerEndAt: room.timerEndAt,
          phaseStartedAt: room.phaseStartedAt,
        },
      });

      this.logger.log(`Room ${roomId} finished BREAK. Starting FOCUS.`);
    }
  }
}
