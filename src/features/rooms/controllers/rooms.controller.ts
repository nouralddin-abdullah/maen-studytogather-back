import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RoomsService } from '../services/rooms.service';
import {
  CurrentUser,
  FileSizes,
  ImageUpload,
  UploadedImage,
} from '@core/decorators';
import { Serialize } from '@core/interceptors';
import {
  ApiResponseDTO,
  PaginatedResponseDTO,
  PaginationQueryDto,
} from '@shared/dto/index';
import { type AuthenticatedUser } from '@shared/types';
import { CreateRoomDto } from '../dto/create-room.dto';
import { RoomDTO, HostRoomDTO } from '../dto/room.dto';
import { CreateRoomSwaggerDto } from '../swagger/create-room-swagger.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { JoinRoomDto } from '../dto/join-room.dto';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { UpdatePomodoroDto } from '../dto/update-pomodoro.dto';
import { PresenceService } from '@features/presence/presence.service';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(
    private roomsService: RoomsService,
    private readonly presenceService: PresenceService,
  ) {}

  @Post('/create-room')
  @ImageUpload('wallpaper')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateRoomSwaggerDto })
  @Serialize(ApiResponseDTO(RoomDTO))
  async createRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRoomDto,
    @UploadedImage({ required: true, maxSize: FileSizes.MB(5) })
    file: Express.Multer.File,
  ) {
    const room = await this.roomsService.create(body, user.userId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    return {
      success: true,
      message: 'Room created successfully',
      createdItem: room,
    };
  }

  // get all rooms (paginated)
  @Serialize(PaginatedResponseDTO(RoomDTO))
  @Get('discover')
  async getDiscoverRooms(@Query() query: PaginationQueryDto) {
    return await this.roomsService.getDiscovery(query);
  }

  // host-only: get room settings including passCode
  @Get(':roomId/settings')
  @Serialize(ApiResponseDTO(HostRoomDTO))
  async getRoomSettings(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const room = await this.roomsService.getRoomSettings(roomId, user.userId);
    return {
      success: true,
      message: 'Room settings retrieved successfully',
      item: room,
    };
  }

  @Patch(':roomId')
  @ImageUpload('wallpaper')
  @ApiConsumes('multipart/form-data')
  @Serialize(ApiResponseDTO(RoomDTO))
  async updateRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId') roomId: string,
    @Body() body: UpdateRoomDto,
    @UploadedImage({ required: false, maxSize: FileSizes.MB(5) })
    file?: Express.Multer.File,
  ) {
    const room = await this.roomsService.update(
      roomId,
      user.userId,
      body,
      file,
    );
    return {
      success: true,
      message: 'Room was updated successfully',
      item: room,
    };
  }

  @Post('join/:inviteCode')
  async joinRoom(
    @Param('inviteCode') inviteCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: JoinRoomDto,
  ) {
    const userId = user.userId;
    return await this.roomsService.join(inviteCode, body?.passCode, userId);
  }

  @Post('leave')
  async leaveRoom(@CurrentUser() user: AuthenticatedUser) {
    return await this.roomsService.leave(user.userId);
  }

  @Sse('sse/:roomId')
  async connectToRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId') roomId: string,
    @Req() req: Request,
  ): Promise<Observable<MessageEvent>> {
    const room = await this.roomsService.findOne(roomId);
    const roomData = {
      roomId: room!.id,
      roomName: room!.name,
      inviteCode: room!.inviteCode,
    };
    this.presenceService.setOnline(user.userId, roomData).catch((err) => {
      console.error(
        `[Presence] Failed to set user ${user.userId} online:`,
        err,
      );
    });
    const heartbeatInterval = setInterval(() => {
      this.presenceService.setOnline(user.userId, roomData).catch((err) => {
        console.error(`[Presence] Failed to refresh user ${user.userId}:`, err);
      });
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeatInterval);
      this.roomsService.handleUserDisconnect(user.userId);
      this.presenceService.setOffline(user.userId).catch((err) => {
        console.error(
          `[Presence] Failed to set user ${user.userId} offline:`,
          err,
        );
      });
    });

    return this.roomsService.subscribeToRoomEvents(roomId);
  }

  @Post(':roomId/start-timer')
  async startTimer(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.roomsService.startTimer(roomId, user.userId);
  }

  @Post(':roomId/pause-timer')
  async pauseTimer(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.roomsService.pauseTimer(roomId, user.userId);
  }

  @Post(':roomId/resume-timer')
  async resumeTimer(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.roomsService.resumeTimer(roomId, user.userId);
  }

  @Post(':roomId/restart-timer')
  async restartTimer(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.roomsService.restartTimer(roomId, user.userId);
  }

  @Patch(':roomId/change-pomodoro')
  async changePomodoro(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdatePomodoroDto,
  ) {
    return await this.roomsService.changePomodoro(roomId, user.userId, body);
  }
}
