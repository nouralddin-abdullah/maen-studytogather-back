import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AmbientSound, RoomTheme, TimerPhase } from '../enums/rooms.enums';
import { User } from '@features/users';
import { StudySession } from './study-session.entity';

@Entity()
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500 })
  description: string;

  @Column({ type: 'varchar', default: RoomTheme.CLASSIC })
  theme: RoomTheme;

  @Column({ type: 'varchar', default: AmbientSound.NONE })
  ambientSound: AmbientSound;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: 0 })
  currentNumParticipents: number;

  @Column()
  wallPaperUrl: string;

  @Column({ unique: true })
  inviteCode: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  passCode?: string | null;

  @Column({ default: 10 })
  maxCapacity: number;

  @Column({ default: 50 })
  focusDuration: number;

  @Column({ default: 10 })
  breakDuration: number;

  @Column({ type: 'varchar', default: TimerPhase.IDLE })
  currentPhase: TimerPhase;

  @Column({ type: 'timestamp with time zone', nullable: true })
  timerEndAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ nullable: true, type: 'timestamp with time zone' })
  phaseStartedAt: Date | null;
  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column({ type: 'uuid' })
  hostId: string;

  @OneToMany(() => StudySession, (session) => session.room)
  sessions: StudySession[];
}
