import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../services/auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { emails, displayName, photos } = profile;

    // google email is verified when using 'email' scope
    const email = emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email provided from Google'), undefined);
    }

    // getting display name from the email by removing @gmail.com (might be changed later)
    // getting the user gmail photo as avatar
    const googleProfile = {
      email,
      displayName: displayName || email.split('@')[0],
      avatar: photos?.[0]?.value,
    };

    // find or create user for it's logic check authService validate google user, then return for JWT generation
    const user = await this.authService.validateGoogleUser(googleProfile);
    done(null, user);
  }
}
