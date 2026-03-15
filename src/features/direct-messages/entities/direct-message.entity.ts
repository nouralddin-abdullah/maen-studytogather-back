import { User } from '@features/users';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('direct_messages')
export class DirectMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  senderId: string;

  @Column('uuid')
  receiverId: string;

  @Column('text')
  text: string;

  @Column('uuid', { nullable: true })
  replyToId: string | null;

  @ManyToOne(() => DirectMessage, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replyToId' })
  replyTo: DirectMessage;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToMany(() => User)
  @JoinColumn({ name: 'receiverId' })
  receiver: User;
}
