import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import { LeaderboardPeriod, LeaderboardService } from './leaderboard.service';
import { success } from 'zod';
import { CurrentUser } from '@core/decorators';
import { type AuthenticatedUser } from '@shared/types';

@Controller('user/leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getGlobalLeaderboard(
    @Query('period') period: string = 'daily',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const validPeriods = ['daily', 'weekly', 'monthly', 'overall'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException(
        'Invalud perios, use daily, weekly, monthly, overall',
      );
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const result = await this.leaderboardService.getLeaderboard(
      period as LeaderboardPeriod,
      pageNum,
      limitNum,
    );

    return {
      success: true,
      period,
      page: pageNum,
      limit: limitNum,
      total: result.totalItems,
      data: result.data,
    };
  }

  @Get('me')
  async getMyLeaderboardRank(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: string = 'daily',
  ) {
    const validPeriods = ['daily', 'weekly', 'monthly', 'overall'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException(
        'Invalud perios, use daily, weekly, monthly, overall',
      );
    }

    const myStats = await this.leaderboardService.getUserRank(
      user.userId,
      period as LeaderboardPeriod,
    );
    return {
      success: true,
      period,
      ...myStats,
    };
  }
}
