import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';

// Core imports
import {
  Public,
  CurrentUser,
  ImageUpload,
  UploadedImage,
  FileSizes,
  Roles,
} from '@core/decorators';
import { Serialize } from '@core/interceptors';
import { secrets } from '@core/config';

// Shared imports
import { PaginatedResponseDTO, PaginationQueryDto } from '@shared/dto';
import { Role, type AuthenticatedUser } from '@shared/types';

// Feature imports
import { UsersService } from '../services/users.service';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { UserDTO } from '../dto/user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { UpdatePasswordDto } from '../dto/change-password.dto';
import { ForgetPasswordDto } from '../dto/forget-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SignupSwaggerDto } from '../swagger/signup-swagger.dto';
import { UpdateMeSwaggerDto } from '../swagger/updateme-swagger.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  // create new user (signup)
  @Public()
  @Post('/signup')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SignupSwaggerDto })
  @ImageUpload('avatar')
  async signup(
    @Body() body: CreateUserDto,
    @UploadedImage({ required: false, maxSize: FileSizes.MB(5) })
    file?: Express.Multer.File,
  ) {
    const token = await this.authService.signup(
      body.email,
      body.username,
      body.password,
      body.nickName,
      file
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          }
        : undefined,
    );
    return {
      success: true,
      message: 'User created successfully',
      data: token,
    };
  }

  // login with username/email and password
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('/signin')
  async signin(@Body() _body: LoginUserDto, @Request() req: { user: any }) {
    // req.user is populated by LocalStrategy.validate()
    const token = this.authService.generateToken(req.user);
    return {
      success: true,
      message: 'Login successful',
      data: token,
    };
  }

  // get the current user from the token
  @Get('/me')
  @Serialize(UserDTO)
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return await this.usersService.findOne(user.userId);
  }

  // update current user
  @Patch('/me')
  @ApiConsumes('multipart/form-data')
  @ImageUpload('avatar')
  @ApiBody({ type: UpdateMeSwaggerDto })
  async updateCurrentUser(
    @CurrentUser('userId') userId: string,
    @Body() body: UpdateUserDTO,
    @UploadedImage({ required: false, maxSize: FileSizes.MB(5) })
    file?: Express.Multer.File,
  ) {
    await this.usersService.update(
      userId,
      body,
      file
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          }
        : undefined,
    );
    return {
      success: true,
      message: 'Profile updated successfully',
    };
  }

  @Patch('/change-password')
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() body: UpdatePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
    );
    return {
      success: true,
      message: 'User password was changed!',
    };
  }

  @Post('/forget-password')
  @Public()
  async forgetPassword(@Body() body: ForgetPasswordDto) {
    return await this.authService.forgetPassword(body.email);
  }

  @Post('/reset-password')
  @Public()
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body.token, body.newPassword);
  }

  // delete the current user
  @Delete('/me')
  async deleteCurrentUser(@CurrentUser('userId') userId: string) {
    await this.usersService.remove(userId);
    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  // get user by id
  @Serialize(UserDTO)
  @Get('/users/:id')
  async getUserById(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  // get all users (paginated)
  @Serialize(PaginatedResponseDTO(UserDTO))
  @Get('users')
  @Roles(Role.ADMIN)
  async getUsers(@Query() query: PaginationQueryDto) {
    return await this.usersService.findAll(query);
  }

  // init the google auth flow
  @Public()
  @Get('/auth/google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth() {
    // this only redirect to google since we are using the Guard, this method body won't be
    // ecxecuted anyway
  }

  // google OAuth callback - handles the redirect from Google
  @Public()
  @Get('/auth/google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  googleAuthCallback(@Request() req: { user: any }, @Res() res: Response) {
    // req.user is populated by GoogleStrategy.validate()
    const token = this.authService.generateToken(req.user);

    // you have 2 options depending on your use cases:
    // option 1: redirect to frontend with token in query params
    // good for web apps - frontend can extract token and store it
    const frontendUrl = secrets.frontendUrl;
    res.redirect(
      `${frontendUrl}/auth/callback?token=${token.accessToken}&expiresIn=${token.expiresIn}`,
    );

    // option 2: return JSON directly (uncomment if you prefer this)
    // return { success: true, message: 'Google login successful', data: token };
  }
}
