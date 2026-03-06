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

@Injectable()
export class GoalsService {
  constructor(
    private userService: UsersService,
    @InjectRepository(StudySession)
    private sessionRepo: Repository<StudySession>,
    @InjectRepository(Goal) private goalRepo: Repository<Goal>,
  ) {}
  async create(userId: string, createGoalDto: CreateGoalDto) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new NotFoundException('This user is not found');
    const goal = this.goalRepo.create({
      ...createGoalDto,
      userId: userId,
    });
    return await this.goalRepo.save(goal);
  }

  async update(id: string, userId: string, updateGoalDto: UpdateGoalDto) {
    const goal = await this.goalRepo.findOneBy({ id });
    if (!goal) throw new NotFoundException("Goal wasn't found");
    if (goal.userId != userId)
      throw new ForbiddenException('Only goal owner can edit it');
    Object.assign(goal, updateGoalDto);
    return await this.goalRepo.save(goal);
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
