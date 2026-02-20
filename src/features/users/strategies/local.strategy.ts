import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../services/auth.service';
import { User } from '../entities/user.entity';

// passport local strategy used for login to check against DB Records
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'loginIdentifier', // email / username
      passwordField: 'password',
    });
  }

  // validate with credentails
  // auto called when using @LocalAuthGuard Guard
  async validate(loginIdentifier: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(loginIdentifier, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
