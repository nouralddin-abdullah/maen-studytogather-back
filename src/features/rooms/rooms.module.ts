import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomsService } from './services/rooms.service';
import { RoomsController } from './controllers/rooms.controller';
import { StudySession } from './entities/study-session.entity';
import { UsersService } from '@features/users';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room]),
    TypeOrmModule.forFeature([StudySession]),
  ],
  providers: [RoomsService, UsersService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
