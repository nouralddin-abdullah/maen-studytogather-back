import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { RoomDTO } from '../dto/room.dto';
import { CreateRoomSwaggerDto } from '../swagger/create-room-swagger.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { JoinRoomDto } from '../dto/join-room.dto';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

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

  // get all users (paginated)
  @Serialize(ApiResponseDTO(RoomDTO))
  @Get('discover')
  async getUsers(@Query() query: PaginationQueryDto) {
    return await this.roomsService.getDiscovery(query);
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
  @Serialize(ApiResponseDTO)
  async joinRoom(
    @Param('inviteCode') inviteCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: JoinRoomDto,
  ) {
    const userId = user.userId;
    return await this.roomsService.join(inviteCode, body.passCode, userId);
  }
}
