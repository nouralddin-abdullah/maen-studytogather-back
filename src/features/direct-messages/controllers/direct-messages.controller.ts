import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { DirectMessagesService } from '../services/direct-messages.service';
import { CurrentUser } from '@core/decorators';
import { type AuthenticatedUser } from '@shared/types';
import { PaginationQueryDto } from '@shared/dto';
import { CreateMessageDto } from '../dto/create-message.dto';
import { success } from 'zod';
import { UpdateMessageDto } from '../dto/update-message.dto';

@Controller('direct-messages')
export class DirectMessagesController {
  constructor(private readonly dmService: DirectMessagesService) {}

  @Get('conversation/:friendId')
  async getConversationHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('friendId') friendId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return await this.dmService.getConversation(user.userId, friendId, query);
  }

  @Patch(':messageId')
  async editMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() body: UpdateMessageDto,
  ) {
    const updatedMessage = await this.dmService.updateMessage(
      user.userId,
      messageId,
      { text: body.text },
    );
    return {
      success: true,
      message: updatedMessage,
    };
  }
}
