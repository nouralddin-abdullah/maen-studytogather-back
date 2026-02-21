import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StudySessionStatus } from '../enums/study-session.enums';
import { User } from '@features/users';
import { Room } from './room.entity';

@Entity()
export class StudySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: StudySessionStatus.ACTIVE })
  status: StudySessionStatus;

  @Column({ default: Date.now })
  joinedAt: Date;

  @Column({ type: 'date', nullable: true })
  leftAt: Date | null;

  @Column({ default: 0 })
  totalFocusMinutes: number;

  // Relations
  @ManyToOne(() => User, (user) => user.studySessions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Room, (room) => room.sessions)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'uuid' })
  roomId: string;
}
