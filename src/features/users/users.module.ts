import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

// Controllers
import { UsersController } from './controllers/users.controller';
import { FriendshipsController } from './controllers/friendships.controller';

// Services
import { UsersService } from './services/users.service';
import { AuthService } from './services/auth.service';
import { FriendshipsService } from './services/friendships.service';

// Entities
import { User } from './entities/user.entity';
import { Friendship } from './entities/friendship.entity';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { DailyStudyLog } from './entities/daily-study-log.entity';
import { BullModule } from '@nestjs/bullmq';
import { USER_STATS_QUEUE } from './constants/user-stats.constants';
import { UserStatsProcessor } from './services/user-stats.processor';
import { PresenceModule } from '@features/presence/presence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DailyStudyLog, Friendship]),
    BullModule.registerQueue({
      name: USER_STATS_QUEUE,
    }),
    // JWT with async config from environment
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') ?? '24h',
        },
      }),
      inject: [ConfigService],
    }),
    PresenceModule,
  ],
  controllers: [UsersController, FriendshipsController],
  providers: [
    UsersService,
    AuthService,
    FriendshipsService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    UserStatsProcessor,
  ],
  exports: [UsersService, AuthService],
})
export class UsersModule {}
