import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AmbientSound, RoomTheme } from '../enums/rooms.enums';

// Swagger documentation DTO — validation is handled by CreateRoomDto with Zod
export class CreateRoomSwaggerDto {
  @ApiProperty({ example: "Toasty's Room", minLength: 10, maxLength: 100 })
  name: string;

  @ApiProperty({
    example: 'We doing focus sessions',
    minLength: 10,
    maxLength: 500,
  })
  description: string;

  @ApiPropertyOptional({
    enum: RoomTheme,
    example: RoomTheme.CLASSIC,
    description: 'Room theme',
  })
  theme?: RoomTheme;

  @ApiPropertyOptional({
    enum: AmbientSound,
    example: AmbientSound.RAIN,
    description: 'Ambient sound',
  })
  ambientSound?: AmbientSound;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the room is public',
  })
  isPublic?: boolean;

  @ApiPropertyOptional({
    example: 'secret',
    minLength: 3,
    maxLength: 15,
    description: 'Room passcode',
  })
  passCode?: string;

  @ApiPropertyOptional({
    example: 10,
    minimum: 2,
    maximum: 20,
    default: 10,
    description: 'Max number of participants',
  })
  maxCapacity?: number;

  @ApiProperty({
    example: 50,
    minimum: 5,
    maximum: 360,
    description: 'Focus duration in minutes',
  })
  focusDuration: number;

  @ApiProperty({
    example: 10,
    minimum: 5,
    maximum: 360,
    description: 'Break duration in minutes',
  })
  breakDuration: number;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Room wallpaper image',
  })
  wallpaper: Express.Multer.File;
}
