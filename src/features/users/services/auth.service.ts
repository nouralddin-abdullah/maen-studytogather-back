import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scrypt as _scrypt, createHash } from 'crypto';
import { promisify } from 'util';

// Feature imports
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';

// Shared imports
import { TokenResponse, JwtPayload } from '@shared/types';

// Core imports
import { secrets } from '@core/config';

// Other feature imports
import { MailService } from '@features/mail';

const scrypt = promisify(_scrypt);

// constants for password hashing
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  // register a new user
  async signup(
    email: string,
    username: string,
    password: string,
    nickName: string,
    avatarFile?: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<TokenResponse> {
    // hash the password
    const hashedPassword = await this.hashPassword(password);

    // create user (usersService handles duplicate checks and avatar upload)
    // you might wanna to not store the username with lower case
    // you can change that but u will need to make sure to handle the login
    // in case of the identifier was username to not make it lowercase
    const user = await this.usersService.create(
      email.toLowerCase(),
      username.toLowerCase(),
      nickName,
      hashedPassword,
      avatarFile,
    );

    // return JWT token
    return this.generateToken(user);
  }

  // validate user, this method is used by local strategy (passport)
  async validateUser(
    loginIdentifier: string,
    password: string,
  ): Promise<User | null> {
    // find user email or password
    const user = await this.usersService.findByLoginIdentifier(loginIdentifier);
    if (!user) {
      return null;
    }

    // now verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // generate the jwt (includes role for RBAC - no DB lookup on each request)
  generateToken(user: User): TokenResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
      tokenType: 'Bearer',
    };
  }

  //change password for currentUser
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException("User wasn't found!");
    }
    const isPasswordValid = await this.verifyPassword(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Wrong password!');
    }
    const newHashedPassword = await this.hashPassword(newPassword);
    user.password = newHashedPassword;
    return this.usersService.save(user);
  }

  // forget password req & send reset password email
  async forgetPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      return { message: 'If your email exist, the reset mail has been sent' };
    }

    // generate reset token
    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    // save to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpired = expires;
    await this.usersService.save(user);

    // let's now build the url and send email with mail service
    const resetUrl = `${secrets.frontendUrl}/reset-password?token=${rawToken}`; //make sure frontend url is in env
    await this.mailService.sendPasswordReset(user.email, {
      username: user.username,
      resetUrl,
      expiresIn: '1 hour',
      appName: 'Together',
    });
    //important note: if MAIL_QUEUE_ENABLED=false this will be sync call so user will wait for return
    // and bullmq not being used, it's only for test. if you want to go production use redis and make MAIL_QUEUE_ENABLED=true
    return { message: 'If email exists, reset link sent' };
  }

  // reset password with token (from email link)
  async resetPassword(token: string, newPassword: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // check if user has token or if it was expired
    if (!user.passwordResetExpired || user.passwordResetExpired < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // hash the new password and update
    user.password = await this.hashPassword(newPassword);

    // clear reset token fields
    user.passwordResetToken = null;
    user.passwordResetExpired = null;

    await this.usersService.save(user);

    return { message: 'Password reset successful' };
  }

  // HELPERTS TO HASH PASSWORD AND VERIFY IT

  // hash password with salt
  // you might consider using Argon2id it's recommended those days, but both works fine.
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH).toString('hex');
    const hash = (await scrypt(password, salt, HASH_LENGTH)) as Buffer;
    return `${salt}.${hash.toString('hex')}`;
  }

  // verify candidate password Vs the stored one with salts
  private async verifyPassword(
    candidatePassword: string,
    storedPassword: string,
  ): Promise<boolean> {
    const [salt, storedHash] = storedPassword.split('.');
    const candidateHash = (await scrypt(
      candidatePassword,
      salt,
      HASH_LENGTH,
    )) as Buffer;
    return storedHash === candidateHash.toString('hex');
  }

  // google OAuth:
  // 1- find existing user by email
  // 2-create new one if the email wasn't already found
  async validateGoogleUser(profile: {
    email: string;
    displayName: string;
    avatar?: string;
  }): Promise<User> {
    const { email, displayName, avatar } = profile;

    // if user exist we just return it
    let user = await this.usersService.findOneByEmail(email);

    if (user) {
      return user;
    }

    // user doesn't exist - create new account
    // generate random password (user won't know it, they'll use Google to login)
    // this honestly might cause some issue to the user later if he wanted to
    // change his password but the key to solve that add 'AuthProvider' in user entity
    // and if it's google don't ask for password (but don't think alot about it since user will mostly login with google)
    const randomPassword = await this.hashPassword(
      Math.random().toString(36).slice(-16) + Date.now().toString(36),
    );

    // generate unique username from email
    const baseUsername = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;

    // making sure that sername is unique -> extra query ik but you can remove it
    // since username is from email - @gmail.com so mostly it wont be repeated
    // you can add also some random number to it, but i will keep the check
    while (await this.usersService.findOneByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // create user via repository using new auth method 'createFromOAuth'
    // because we already did a check and 'create' will do another check
    user = await this.usersService.createFromOAuth({
      email: email.toLowerCase(),
      username,
      nickName: displayName,
      password: randomPassword,
      avatar,
    });

    // return the user to generate a token
    return user;
  }
}
