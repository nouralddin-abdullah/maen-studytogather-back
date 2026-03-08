import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// Core imports
import { CurrentUser } from '@core/decorators';
import { Serialize } from '@core/interceptors';

// Shared imports
import { PaginatedResponseDTO, PaginationQueryDto } from '@shared/dto';

// Feature imports
import { FriendshipsService } from '../services/friendships.service';
import { FriendshipDTO } from '../dto/friendship.dto';
import { SendFriendRequestDto } from '../dto/send-friend-request.dto';
import { RespondFriendRequestDto } from '../dto/respond-friend-request.dto';

@ApiTags('Friendships')
@Controller('friendships')
export class FriendshipsController {
  constructor(private friendshipsService: FriendshipsService) {}

  // send a friend request
  @Post()
  @Serialize(FriendshipDTO)
  async sendFriendRequest(
    @CurrentUser('userId') userId: string,
    @Body() body: SendFriendRequestDto,
  ) {
    const friendship = await this.friendshipsService.sendRequest(
      userId,
      body.addresseeId,
    );
    return {
      success: true,
      message: 'Friend request sent successfully',
      data: friendship,
    };
  }

  // respond to a friend request (accept / reject)
  @Patch(':id/respond')
  @Serialize(FriendshipDTO)
  async respondToRequest(
    @Param('id') friendshipId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: RespondFriendRequestDto,
  ) {
    const friendship = await this.friendshipsService.respondToRequest(
      friendshipId,
      userId,
      body.status,
    );
    return {
      success: true,
      message: `Friend request ${body.status} successfully`,
      data: friendship,
    };
  }

  // get my accepted friends (paginated)
  @Get()
  @Serialize(PaginatedResponseDTO(FriendshipDTO))
  async getMyFriends(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return await this.friendshipsService.getFriends(userId, query);
  }

  // get pending friend requests I received (paginated)
  @Get('requests/pending')
  @Serialize(PaginatedResponseDTO(FriendshipDTO))
  async getPendingRequests(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return await this.friendshipsService.getPendingRequests(userId, query);
  }

  // get friend requests I sent (paginated)
  @Get('requests/sent')
  @Serialize(PaginatedResponseDTO(FriendshipDTO))
  async getSentRequests(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return await this.friendshipsService.getSentRequests(userId, query);
  }

  // remove friendship or cancel request
  @Delete(':id')
  async removeFriendship(
    @Param('id') friendshipId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.friendshipsService.removeFriendship(friendshipId, userId);
    return {
      success: true,
      message: 'Friendship removed successfully',
    };
  }
}
