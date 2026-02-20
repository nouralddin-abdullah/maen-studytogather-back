import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Field, Sex } from '@shared/types';

// this is for clean way with swagger documentation, validation is handled by create user dto with zod
export class SignupSwaggerDto {
  @ApiProperty({ example: 'user@example.com', format: 'email' })
  email: string;

  @ApiProperty({ example: 'johndoe', minLength: 3, maxLength: 20 })
  username: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 50 })
  password: string;

  @ApiProperty({ example: 'John', minLength: 2, maxLength: 50 })
  nickName: string;

  @ApiPropertyOptional({
    example: 'US',
    minLength: 2,
    maxLength: 2,
    description: 'ISO 3166-1 alpha-2 country code',
  })
  country?: string;

  @ApiPropertyOptional({
    enum: Sex,
    example: Sex.MALE,
    description: 'Gender (male or female)',
  })
  gender?: Sex;

  @ApiPropertyOptional({
    enum: Field,
    example: Field.COMPUTER_SCIENCE,
    description: 'Field of study',
  })
  field?: Field;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile picture',
  })
  avatar?: Express.Multer.File;
}
