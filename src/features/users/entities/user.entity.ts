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

  @Column({ type: 'date', default: 0, nullable: true })
  lastStudyDate: Date | null;

  @OneToMany(() => StudySession, (session) => session.user)
  studySessions: StudySession[];
}
