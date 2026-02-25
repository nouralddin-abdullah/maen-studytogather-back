import { ApiPropertyOptional } from '@nestjs/swagger';
import { Field, Sex } from '@shared/types';

// this is for clean way with swagger documentation, validation is handled by update user dto with zod
export class UpdateMeSwaggerDto {
  @ApiPropertyOptional({ example: 'johndoe', minLength: 3, maxLength: 20 })
  username?: string;

  @ApiPropertyOptional({ example: 'John', minLength: 2, maxLength: 50 })
  nickName?: string;

  @ApiPropertyOptional({
    example: 'US',
    minLength: 2,
    maxLength: 2,
    description: 'ISO 3166-1 alpha-2 country code',
  })
  country?: string | null;

  @ApiPropertyOptional({
    enum: Sex,
    example: Sex.MALE,
    description: 'Gender',
  })
  gender?: Sex | null;

  @ApiPropertyOptional({
    description: 'timezone of user',
  })
  timezone?: string | null;

  @ApiPropertyOptional({
    enum: Field,
    example: Field.COMPUTER_SCIENCE,
    description: 'Field of study',
  })
  field?: Field | null;

  @ApiPropertyOptional({
    example: 'Stay focused, stay learning!',
    maxLength: 200,
  })
  quote?: string | null;

  @ApiPropertyOptional({
    example: ['programming', 'math'],
    type: [String],
    description: 'List of interests (max 10)',
  })
  interests?: string[] | null;

  @ApiPropertyOptional({
    example: 'user#1234',
    maxLength: 50,
    description: 'Discord username',
  })
  discordUsername?: string | null;

  @ApiPropertyOptional({
    example: 'https://twitter.com/user',
    description: 'Twitter/X profile URL',
  })
  twitterUrl?: string | null;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile picture',
  })
  avatar?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile background image',
  })
  profileBackground?: Express.Multer.File;
}
