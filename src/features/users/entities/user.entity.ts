import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role, Field, Sex } from '@shared/types/index';
import { StudySession } from '@features/rooms/entities/study-session.entity';
import { DailyStudyLog } from './daily-study-log.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  field: Field | null;

  @Column({ type: 'char', length: 2, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', nullable: true })
  gender: Sex | null;

  @Column()
  nickName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, type: 'text' })
  quote: string | null;

  @Column({ nullable: true, type: 'varchar', array: true })
  interests: string[] | null;

  @Column({ nullable: true, type: 'varchar' })
  profileBackgroundUrl: string | null;

  @Column({ default: 0 })
  sessionsCount: number;

  @Column({ default: 0 })
  totalFocusMinutes: number;

  @Column({ nullable: true, type: 'varchar' })
  discordUsername: string | null;

  @Column({ type: 'varchar', default: 'UTC' })
  timezone: string;

  @Column({ nullable: true, type: 'varchar' })
  twitterUrl: string | null;

  @Column()
  password: string;

  @Column({ type: 'varchar', default: Role.USER })
  role: Role;

  @Column({ type: 'varchar', nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpired: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: 0 })
  currentStreak: number;

  @Column({ default: 0 })
  longestStreak: number;

  @Column({ type: 'date', nullable: true, default: null })
  lastStudyDate: Date | null;

  @OneToMany(() => StudySession, (session) => session.user)
  studySessions: StudySession[];

  @OneToMany(() => DailyStudyLog, (log) => log.user)
  studyLogs: DailyStudyLog[];
}
