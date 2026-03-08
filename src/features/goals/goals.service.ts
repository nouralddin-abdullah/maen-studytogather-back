import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UsersService } from '@features/users';
import { In, IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Goal } from './entities/goal.entity';
import { StudySession } from '@features/rooms/entities/study-session.entity';
import { StudySessionStatus } from '@features/rooms/enums/study-session.enums';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GoalsService {
  constructor(
    private userService: UsersService,
    @InjectRepository(StudySession)
    private sessionRepo: Repository<StudySession>,
    @InjectRepository(Goal) private goalRepo: Repository<Goal>,
    private eventEmitter: EventEmitter2,
  ) {}
  async create(userId: string, createGoalDto: CreateGoalDto) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new NotFoundException('This user is not found');
    const goal = this.goalRepo.create({
      ...createGoalDto,
      userId: userId,
    });
    const createdGoal = await this.goalRepo.save(goal);
    //check if user in active session and then emit new event to that room with the goal as payload
    const session = await this.sessionRepo.findOneBy({
      status: StudySessionStatus.ACTIVE,
      userId: userId,
    });
    if (session) {
      this.eventEmitter.emit(`room.updated.${session.roomId}`, {
        type: 'USER_CREATED_GOAL',
        payload: {
          goal: createdGoal,
        },
      });
    }

    return createdGoal;
  }

  async update(id: string, userId: string, updateGoalDto: UpdateGoalDto) {
    const goal = await this.goalRepo.findOneBy({ id });
    if (!goal) throw new NotFoundException("Goal wasn't found");
    if (goal.userId != userId)
      throw new ForbiddenException('Only goal owner can edit it');
    const isJustCompleted =
      goal.isCompleted === false && updateGoalDto.isCompleted === true;
    const isUnchecked =
      goal.isCompleted === true && updateGoalDto.isCompleted === false;

    Object.assign(goal, updateGoalDto);
    const updatedGoal = await this.goalRepo.save(goal);

    //Goal event ommit
    const session = await this.sessionRepo.findOneBy({
      status: StudySessionStatus.ACTIVE,
      userId: userId,
    });

    if (session) {
      let eventType = 'USER_UPDATED_GOAL';
      if (isJustCompleted) {
        eventType = 'USER_COMPLETED_GOAL';
      } else if (isUnchecked) {
        eventType = 'USER_UNCHECKED_GOAL';
      }
      this.eventEmitter.emit(`room.updated.${session.roomId}`, {
        type: eventType,
        payload: {
          userId: userId,
          goal: updatedGoal,
        },
      });
    }
    return updatedGoal;
  }

  async getMyGoals(userId: string) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new NotFoundException('This user is not found');
    return await this.goalRepo.find({
      where: {
        userId: userId,
        parentId: IsNull(),
      },
      relations: ['children'],
      order: { createdAt: 'DESC' },
    });
  }

  async removeGoal(goalId: string, userId: string) {
    const goal = await this.goalRepo.findOneBy({ id: goalId });
    if (!goal) throw new NotFoundException("Goal wasn't found");
    if (goal.userId != userId)
      throw new ForbiddenException('Only goal owner can edit it');
    return this.goalRepo.remove(goal);
  }

  async getRoomParticipantsGoals(roomId: string) {
    const activeSessions = await this.sessionRepo.find({
      where: {
        roomId: roomId,
        status: StudySessionStatus.ACTIVE,
      },
      relations: ['user'],
      select: {
        userId: true,
      },
    });

    if (activeSessions.length === 0) {
      return [];
    }

    const userIds = activeSessions.map((session) => session.userId);

    const allGoals = await this.goalRepo.find({
      where: {
        userId: In(userIds),
        parentId: IsNull(),
      },
      relations: ['children'],
      order: { createdAt: 'DESC' },
    });

    const groupedResponse = activeSessions.map((session) => ({
      ...session.user,
      goals: allGoals.filter((goal) => goal.userId === session.userId),
    }));

    return groupedResponse;
  }
}
