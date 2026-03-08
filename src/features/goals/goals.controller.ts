import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CurrentUser } from '@core/decorators';
import { type AuthenticatedUser } from '@shared/types';
import { Serialize } from '@core/interceptors';
import { ApiResponseDTO } from '@shared/dto';
import { GoalDto } from './dto/Goal.dto';
import { RoomParticipantGoalsDto } from './dto/room-participant-goals.dto';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @Serialize(ApiResponseDTO(GoalDto))
  async createGoal(
    @Body() createGoalDto: CreateGoalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const goal = await this.goalsService.create(user.userId, createGoalDto);
    return {
      success: true,
      message: 'Goal created successfully',
      createdItem: goal,
    };
  }

  @Get()
  @Serialize(ApiResponseDTO(GoalDto))
  async getMyGoals(@CurrentUser() user: AuthenticatedUser) {
    const goals = await this.goalsService.getMyGoals(user.userId);
    return {
      success: true,
      message: 'Goals retrieved successfully',
      items: goals,
    };
  }

  // update goal
  @Patch(':id')
  @Serialize(ApiResponseDTO(GoalDto))
  async updateGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') goalId: string,
    @Body() attr: UpdateGoalDto,
  ) {
    const goal = await this.goalsService.update(goalId, user.userId, attr);
    return {
      success: true,
      message: 'Goals updated successfully',
      item: goal,
    };
  }

  // get room participents goals
  @Get('/room/:roomId')
  @Serialize(ApiResponseDTO(RoomParticipantGoalsDto))
  async getRoomGoals(@Param('roomId') roomId: string) {
    const participantsGoals =
      await this.goalsService.getRoomParticipantsGoals(roomId);

    return {
      success: true,
      message: 'Room goals retrieved successfully',
      items: participantsGoals,
    };
  }

  @Delete(':id')
  async deleteGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') goalId: string,
  ) {
    await this.goalsService.removeGoal(goalId, user.userId);
    return {
      success: true,
      message: 'Goals deleted successfully',
    };
  }
}
