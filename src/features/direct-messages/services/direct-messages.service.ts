import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DirectMessage } from '../entities/direct-message.entity';
import { Repository } from 'typeorm';
import { FriendshipsService, FriendshipStatus } from '@features/friendships';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageDto } from '../dto/update-message.dto';
import { createPaginatedResponse, PaginationQuery } from '@shared/dto';

@Injectable()
export class DirectMessagesService {
  constructor(
    @InjectRepository(DirectMessage) private dmRepo: Repository<DirectMessage>,
    private friendshipsService: FriendshipsService,
  ) {}

  async saveMessage(data: {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    replyToId?: string | null;
  }) {
    const newMessage = this.dmRepo.create({
      id: data.id,
      senderId: data.senderId,
      receiverId: data.receiverId,
      text: data.text,
      replyToId: data.replyToId || null,
    });

    return await this.dmRepo.save(newMessage);
  }

  async updateMessage(
    currentUserId: string,
    messageId: string,
    attrs: Partial<DirectMessage>,
  ) {
    const message = await this.dmRepo.findOneBy({ id: messageId });
    if (!message) throw new NotFoundException('Message wasn not found');
    if (message.senderId !== currentUserId)
      throw new ForbiddenException('Only the message owner can edit it');

    Object.assign(message, attrs);
    return await this.dmRepo.save(message);
  }

  async getConversation(
    currentUserId: string,
    friendId: string,
    query: PaginationQuery,
  ) {
    const friendshipCheck = await this.friendshipsService.getFriendshipStatus(
      currentUserId,
      friendId,
    );

    if (friendshipCheck.status !== 'FRIENDS')
      throw new ForbiddenException(
        'You can only view converstations with accepted friends',
      );
    const { page, limit } = query;

    const [messages, total] = await this.dmRepo
      .createQueryBuilder('dm')
      .leftJoinAndSelect('dm.replyTo', 'replyTo')
      .where(
        '(dm.senderId = :currentUserId AND dm.receiverId = :friendId) OR (dm.senderId = :friendId AND dm.receiverId = :currentUserId)',
        { currentUserId, friendId },
      )
      .orderBy('dm.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const chronologicalMessages = messages.reverse();

    return createPaginatedResponse(chronologicalMessages, total, page, limit);
  }
}
