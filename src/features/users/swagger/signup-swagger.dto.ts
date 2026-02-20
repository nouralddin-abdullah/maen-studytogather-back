import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// this is for clean way with swagger documentation, validation is handled by create user dto with zod
export class SignupSwaggerDto {
  @ApiProperty({ example: 'user@example.com', format: 'email' })
  email: string;

  @ApiProperty({ example: 'johndoe', minLength: 3, maxLength: 20 })
  username: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  password: string;

  @ApiProperty({ example: 'John', minLength: 2, maxLength: 50 })
  nickName: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile picture',
  })
  avatar?: Express.Multer.File;
}
