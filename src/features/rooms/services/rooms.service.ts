import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from '../entities/room.entity';
import { Repository } from 'typeorm';
import { StorageService } from '@features/storage';
import { CreateRoomDto } from '../dto/create-room.dto';
import { randomBytes, randomUUID } from 'crypto';
import {
  createPaginatedResponse,
  PaginatedResponse,
  PaginationQuery,
} from '@shared/dto/index';
import { StudySession } from '../entities/study-session.entity';
import { StudySessionStatus } from '../enums/study-session.enums';
import { TimerPhase } from '../enums/rooms.enums';
import { UsersService } from '@features/users';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  ROOM_TIMER_QUEUE,
  RoomTimerJobName,
} from '../constants/rooms.constants';
import { Queue } from 'bullmq';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(StudySession)
    private sessionRepo: Repository<StudySession>,
    @InjectQueue(ROOM_TIMER_QUEUE) private roomTimerQueue: Queue,
    private storageService: StorageService,
    private userService: UsersService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findOne(id: string) {
    return await this.roomRepo.findOneBy({ id });
  }
  async create(
    dto: CreateRoomDto,
    hostId: string,
    wallPaperFile: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<Room> {
    let inviteCode = randomBytes(3).toString('hex');
    let roomId = randomUUID();
    let wallPaperUrl = await this.storageService.upload({
      key: `wallpapers/${roomId}-${Date.now()}`,
      body: wallPaperFile.buffer,
      contentType: wallPaperFile.mimetype,
    });
    const newRoom = this.roomRepo.create({
      id: roomId,
      name: dto.name,
      description: dto.description,
      theme: dto.theme,
      wallPaperUrl: wallPaperUrl.url,
      ambientSound: dto.ambientSound,
      maxCapacity: dto.maxCapacity,
      passCode: dto.passCode,
      isPublic: dto.isPublic,
      focusDuration: dto.focusDuration,
      breakDuration: dto.breakDuration,
      hostId: hostId,
      inviteCode: inviteCode,
    });

    return await this.roomRepo.save(newRoom);
  }

  async getDiscovery(query: PaginationQuery): Promise<PaginatedResponse<Room>> {
    const { page, limit, sortBy, order } = query;

    const [rooms, total] = await this.roomRepo
      .createQueryBuilder('room')
      .addSelect('room.passCode')
      .leftJoinAndSelect('room.host', 'host')
      .orderBy(`room.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = rooms.map((room) => ({
      ...room,
      hasPassCode: !!room.passCode,
    }));

    return createPaginatedResponse(data, total, page, limit);
  }

  async update(
    id: string,
    userId: string,
    attrs: Partial<Room>,
    wallPaperFile?: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<Room> {
    const room = await this.findOne(id);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.hostId != userId) {
      throw new ForbiddenException('Only can be updated by owner');
    }
    Object.assign(room, attrs);
    if (wallPaperFile) {
      const key = `wallpapers/${room.id}-${Date.now()}`;
      const result = await this.storageService.upload({
        key,
        body: wallPaperFile.buffer,
        contentType: wallPaperFile.mimetype,
      });
      room.wallPaperUrl = result.url;
    }

    const result = await this.roomRepo.save(room);
    const visualKeys = ['name', 'theme', 'changeSound'];

    const didSettingsChange =
      visualKeys.some((key) => key in attrs) || !!wallPaperFile;

    if (didSettingsChange) {
      this.eventEmitter.emit(`room.updated.${room.id}`, {
        type: 'ROOM_SETTINGS_CHANGED',
        payload: {
          name: result.name,
          theme: result.theme,
          ambientSound: result.ambientSound,
          wallPaperUrl: result.wallPaperUrl,
        },
      });
    }
    return result;
  }

  async join(
    inviteCode: string,
    passCode: string | undefined | null,
    userId: string,
  ) {
    const room = await this.roomRepo
      .createQueryBuilder('room')
      .where('room.inviteCode = :inviteCode', { inviteCode: inviteCode })
      .addSelect('room.passCode')
      .getOne();

    if (!room) throw new NotFoundException('Room not found');

    if (room.passCode && room.passCode !== passCode) {
      throw new UnauthorizedException('Invalid passcode');
    }

    const joiningUser = await this.userService.findOne(userId);
    if (!joiningUser) throw new NotFoundException('User not found');

    const activeSession = await this.sessionRepo.findOne({
      where: {
        userId: userId,
        status: StudySessionStatus.ACTIVE,
      },
      relations: ['room'],
    });

    if (activeSession) {
      if (activeSession.roomId === room.id) {
        const currentSessions = await this.sessionRepo.find({
          where: { roomId: room.id, status: StudySessionStatus.ACTIVE },
          relations: ['user'],
        });

        const currentParticipants = currentSessions.map((s) => ({
          id: s.user.id,
          nickName: s.user.nickName,
          username: s.user.username,
          avatar: s.user.avatar,
          currentStreak: s.user.currentStreak,
          joinedAt: s.joinedAt,
        }));
        return {
          message: 'Already in room (Refreshed)',
          room: {
            roomId: room.id,
            name: room.name,
            description: room.description,
            theme: room.theme,
            ambientSound: room.ambientSound,
            isPublic: room.isPublic,
            inviteCode: room.inviteCode,
            maxCapacity: room.maxCapacity,
            focusDuration: room.focusDuration,
            pauseRemainingMs: room.pauseRemainingMs,
            breakDuration: room.breakDuration,
            currentPhase: room.currentPhase,
            timerEndAt: room.timerEndAt,
            phaseStartedAt: room.phaseStartedAt,
            hostId: room.hostId,
          },
          participants: currentParticipants,
        };
      } else {
        throw new ConflictException(
          `You are already in another room (${activeSession.room.name}). Please leave it first.`,
        );
      }
    }
    if (room.currentNumParticipents >= room.maxCapacity) {
      throw new ConflictException('Room is full');
    }
    const session = this.sessionRepo.create({
      roomId: room.id,
      userId: userId,
      status: StudySessionStatus.ACTIVE,
    });
    await this.sessionRepo.save(session);
    await this.roomRepo.increment({ id: room.id }, 'currentNumParticipents', 1);
    const newParticipant = {
      id: joiningUser.id,
      nickName: joiningUser.nickName,
      avatar: joiningUser.avatar,
      currentStreak: joiningUser.currentStreak,
      joinedAt: new Date(),
    };
    this.eventEmitter.emit(`room.updated.${room.id}`, {
      type: 'USER_JOINED',
      payload: newParticipant,
    });

    const currentSessions = await this.sessionRepo.find({
      where: { roomId: room.id, status: StudySessionStatus.ACTIVE },
      relations: ['user'],
    });

    const currentParticipants = currentSessions.map((s) => ({
      id: s.user.id,
      nickName: s.user.nickName,
      avatar: s.user.avatar,
      currentStreak: s.user.currentStreak,
      joinedAt: s.joinedAt,
    }));
    return {
      message: 'Joined successfully',
      room: {
        roomId: room.id,
        name: room.name,
        description: room.description,
        theme: room.theme,
        ambientSound: room.ambientSound,
        isPublic: room.isPublic,
        inviteCode: room.inviteCode,
        maxCapacity: room.maxCapacity,
        focusDuration: room.focusDuration,
        pauseRemainingMs: room.pauseRemainingMs,
        breakDuration: room.breakDuration,
        currentPhase: room.currentPhase,
        timerEndAt: room.timerEndAt,
        phaseStartedAt: room.phaseStartedAt,
        hostId: room.hostId,
      },
      currentParticipants: currentParticipants,
    };
  }

  async leave(userId: string) {
    const activeSession = await this.sessionRepo.findOne({
      where: { userId, status: StudySessionStatus.ACTIVE },
      relations: ['room'],
    });

    if (!activeSession) {
      throw new NotFoundException('No active session found');
    }

    const room = activeSession.room;

    if (
      room.currentPhase === TimerPhase.FOCUS &&
      room.phaseStartedAt !== null
    ) {
      const now = Date.now();
      const effectiveStart = Math.max(
        activeSession.joinedAt.getTime(),
        room.phaseStartedAt.getTime(),
      );
      const earnedMinutes = Math.floor((now - effectiveStart) / 60_000);

      if (earnedMinutes > 0) {
        activeSession.totalFocusMinutes += earnedMinutes;
      }
    }
    activeSession.status = StudySessionStatus.COMPELETED;
    activeSession.leftAt = new Date();

    await this.sessionRepo.save(activeSession);
    await this.roomRepo.decrement({ id: room.id }, 'currentNumParticipents', 1);
    this.eventEmitter.emit(`room.updated.${room.id}`, {
      type: 'USER_LEFT',
      payload: {
        userId,
        totalFocusMinutes: activeSession.totalFocusMinutes,
      },
    });

    return {
      message: 'Left the room successfully',
      roomId: room.id,
      totalFocusMinutes: activeSession.totalFocusMinutes,
    };
  }

  subscribeToRoomEvents(roomId: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, `room.updated.${roomId}`).pipe(
      map((data) => {
        return {
          data: data,
        } as MessageEvent;
      }),
    );
  }

  async handleUserDisconnect(userId: string): Promise<void> {
    try {
      await this.leave(userId);
      this.logger.log(`User ${userId} disconnected — session closed`);
    } catch {
      this.logger.debug(
        `User ${userId} disconnected — no active session (already left)`,
      );
    }
  }

  async startTimer(roomId: string, userId: string) {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== userId)
      throw new ForbiddenException(
        'Room timer only can be controllerd by room is host',
      );
    if (
      room.currentPhase !== TimerPhase.IDLE &&
      room.currentPhase !== TimerPhase.BREAK
    ) {
      throw new ConflictException('Timer is already running or paused');
    }

    const now = new Date();
    room.currentPhase = TimerPhase.FOCUS;
    room.phaseStartedAt = now;
    room.timerEndAt = new Date(now.getTime() + room.focusDuration * 60000);
    await this.roomRepo.save(room);

    await this.roomTimerQueue.add(
      RoomTimerJobName.PHASE_END,
      {
        roomId: room.id,
        phase: TimerPhase.FOCUS,
      },
      {
        delay: room.focusDuration * 60000,
        jobId: `timer-${roomId}`,
        removeOnComplete: true,
      },
    );

    this.eventEmitter.emit(`room.updated.${room.id}`, {
      type: 'PHASE_CHANGED',
      payload: {
        phase: TimerPhase.FOCUS,
        timerEndAt: room.timerEndAt,
        phaseStartedAt: room.phaseStartedAt,
      },
    });
    return { message: 'Timer started' };
  }

  async pauseTimer(roomId: string, userId: string) {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== userId)
      throw new ForbiddenException('Only the host can pause the timer');
    if (room.currentPhase !== TimerPhase.FOCUS)
      throw new ConflictException('Can only pause during FOCUS phase');

    const now = new Date();
    const remainingMs = room.timerEndAt!.getTime() - now.getTime();

    // 1. Credit partial focus time immediately!
    const activeSessions = await this.sessionRepo.find({
      where: { roomId: room.id, status: StudySessionStatus.ACTIVE },
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
      }
    }
    await this.sessionRepo.save(activeSessions); // Bulk save!

    // 2. Assassinate the pending BullMQ job (No DB lookup needed!)
    await this.roomTimerQueue.remove(`timer-${room.id}`);

    // 3. Update Room State
    room.currentPhase = TimerPhase.PAUSED;
    room.phaseStartedAt = null;
    room.timerEndAt = null;
    room.pauseRemainingMs = remainingMs;
    await this.roomRepo.save(room);

    this.eventEmitter.emit(`room.updated.${room.id}`, {
      type: 'PHASE_CHANGED',
      payload: { phase: TimerPhase.PAUSED, pausedRemainingMs: remainingMs },
    });

    return { message: 'Timer paused' };
  }

  async resumeTimer(roomId: string, userId: string) {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== userId)
      throw new ForbiddenException('Only the host can resume the timer');
    if (room.currentPhase !== TimerPhase.PAUSED)
      throw new ConflictException('Timer is not paused');

    const now = new Date();
    room.currentPhase = TimerPhase.FOCUS;
    room.phaseStartedAt = now;
    room.timerEndAt = new Date(now.getTime() + room.pauseRemainingMs!);

    const delayMs = room.pauseRemainingMs!;
    room.pauseRemainingMs = null;

    await this.roomRepo.save(room);

    await this.roomTimerQueue.add(
      RoomTimerJobName.PHASE_END,
      { roomId: room.id, phase: TimerPhase.FOCUS },
      { delay: delayMs, jobId: `timer-${room.id}`, removeOnComplete: true },
    );

    this.eventEmitter.emit(`room.updated.${room.id}`, {
      type: 'PHASE_CHANGED',
      payload: {
        phase: TimerPhase.FOCUS,
        timerEndAt: room.timerEndAt,
        phaseStartedAt: room.phaseStartedAt,
      },
    });

    return { message: 'Timer resumed' };
  }

  async restartTimer(roomId: string, userId: string) {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== userId)
      throw new ForbiddenException('Only the host can restart the timer');
    if (room.currentPhase !== TimerPhase.PAUSED)
      throw new ConflictException(
        'You cannot restart timer when timer is not paused',
      );
    room.currentPhase = TimerPhase.IDLE;
    room.pauseRemainingMs = null;
    room.phaseStartedAt = null;
    room.timerEndAt = null;
    await this.roomRepo.save(room);
    this.eventEmitter.emit(`room.updated.${room.id}`, {
      type: 'PHASE_CHANGED',
      payload: {
        phase: TimerPhase.IDLE,
        pomodoro: {
          focusDuration: room.focusDuration,
          breakDuration: room.breakDuration,
        },
      },
    });
    return { message: 'Timer restarted' };
  }

  async changePomodoro(roomId: string, userId: string, attrs: Partial<Room>) {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== userId)
      throw new ForbiddenException(
        'Only the host can change the pomodoro timer settings',
      );
    if (room.currentPhase !== TimerPhase.IDLE)
      throw new ConflictException(
        'You cannot change pomodoro timer settings when timer is not idle (stopped)',
      );
    Object.assign(room, attrs);
    await this.roomRepo.save(room);
    this.eventEmitter.emit(`room.updated.${room.id}`, {
      type: 'POMODORO_CHANGED',
      payload: {
        pomodoro: {
          focusDuration: room.focusDuration,
          breakDuration: room.breakDuration,
        },
      },
    });
    return { message: 'Pomodoro changed!' };
  }
}
