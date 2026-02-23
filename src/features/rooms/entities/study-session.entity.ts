import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StudySessionStatus } from '../enums/study-session.enums';
import { User } from '@features/users/entities/user.entity';
import { Room } from './room.entity';

@Entity()
export class StudySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: StudySessionStatus.ACTIVE })
  status: StudySessionStatus;

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  joinedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
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
