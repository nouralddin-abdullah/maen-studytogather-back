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
import { UsersService } from '@features/users';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(StudySession)
    private sessionRepo: Repository<StudySession>,
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

    const [data, total] = await this.roomRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: order.toUpperCase() as 'ASC' | 'DESC' },
    });

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

    // save it now
    return await this.roomRepo.save(room);
  }

  async join(
    inviteCode: string,
    passCode: string | undefined | null,
    userId: string,
  ) {
    const room = await this.roomRepo.findOneBy({ inviteCode: inviteCode });
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
          avatar: s.user.avatar,
          currentStreak: s.user.currentStreak,
          joinedAt: s.joinedAt,
        }));
        return {
          message: 'Already in room (Refreshed)',
          roomId: room.id,
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
      roomId: room.id,
      currentParticipants: currentParticipants,
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
}
