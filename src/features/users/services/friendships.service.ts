import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Friendship } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enums/friendship-status.enum';
import {
  PaginationQuery,
  PaginatedResponse,
  createPaginatedResponse,
} from '@shared/dto';
import { PresenceService } from '@features/presence/presence.service';

@Injectable()
export class FriendshipsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    private presenceService: PresenceService,
  ) {}

  async getAcceptedFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.friendshipRepo.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      select: ['requesterId', 'addresseeId'],
    });

    const friendIds = friendships.map((friendship) => {
      return friendship.requesterId === userId
        ? friendship.addresseeId
        : friendship.requesterId;
    });

    return friendIds;
  }

  // send a friend request
  async sendRequest(
    requesterId: string,
    addresseeId: string,
  ): Promise<Friendship> {
    if (requesterId === addresseeId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }
    // check if a friendship already exists in either direction
    const existing = await this.friendshipRepo
      .createQueryBuilder('f')
      .where(
        '(f.requesterId = :requesterId AND f.addresseeId = :addresseeId) OR (f.requesterId = :addresseeId AND f.addresseeId = :requesterId)',
        { requesterId, addresseeId },
      )
      .getOne();

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('You are already friends with this user');
      }
      if (
        existing.status === FriendshipStatus.PENDING &&
        existing.requesterId === requesterId
      ) {
        throw new ConflictException(
          'You have already sent a friend request to this user',
        );
      }
      if (
        existing.status === FriendshipStatus.PENDING &&
        existing.addresseeId === requesterId
      ) {
        // the other user already sent us a request, auto-accept
        existing.status = FriendshipStatus.ACCEPTED;
        return await this.friendshipRepo.save(existing);
      }
      if (existing.status === FriendshipStatus.REJECTED) {
        // allow re-sending after rejection
        existing.requesterId = requesterId;
        existing.addresseeId = addresseeId;
        existing.status = FriendshipStatus.PENDING;
        return await this.friendshipRepo.save(existing);
      }
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException('This friendship action is not allowed');
      }
    }

    const friendship = this.friendshipRepo.create({
      id: randomUUID(),
      requesterId,
      addresseeId,
      status: FriendshipStatus.PENDING,
    });

    return await this.friendshipRepo.save(friendship);
  }

  // respond to a friend request (accept / reject)
  async respondToRequest(
    friendshipId: string,
    currentUserId: string,
    status: FriendshipStatus.ACCEPTED | FriendshipStatus.REJECTED,
  ): Promise<Friendship> {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: friendshipId },
      relations: ['requester', 'addressee'],
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    // only the addressee can respond
    if (friendship.addresseeId !== currentUserId) {
      throw new ForbiddenException(
        'You are not authorized to respond to this friend request',
      );
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException(
        'This friend request has already been responded to',
      );
    }

    friendship.status = status;
    return await this.friendshipRepo.save(friendship);
  }

  // get accepted friends (paginated)
  async getFriends(
    userId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit } = query;

    const [data, total] = await this.friendshipRepo.findAndCount({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
      skip: (page - 1) * limit,
      take: limit,
      order: { updatedAt: 'DESC' },
    });

    if (data.length === 0)
      return createPaginatedResponse(data, total, page, limit);

    const friendIds = data.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
    const onlineStatuses =
      await this.presenceService.getOnlineStatus(friendIds);
    const statusMap = new Map<string, any>();
    for (const status of onlineStatuses) {
      statusMap.set(status.userId, status);
    }

    const enrichedData = data.map((friendship) => {
      const isRequester = friendship.requesterId === userId;
      const friendProfile = isRequester
        ? friendship.addressee
        : friendship.requester;
      const presence = statusMap.get(friendProfile.id);
      return {
        ...friendship,
        friendProfile: friendProfile,
        isOnline: presence?.isOnline || false,
        roomId: presence?.roomId,
        roomName: presence?.roomName,
        inviteCode: presence?.inviteCode,
      };
    });

    return createPaginatedResponse(enrichedData, total, page, limit);
  }

  // get pending friend requests received by the user (paginated)
  async getPendingRequests(
    userId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<Friendship>> {
    const { page, limit } = query;

    const [data, total] = await this.friendshipRepo.findAndCount({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester', 'addressee'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  // get sent friend requests by the user (paginated)
  async getSentRequests(
    userId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<Friendship>> {
    const { page, limit } = query;

    const [data, total] = await this.friendshipRepo.findAndCount({
      where: { requesterId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester', 'addressee'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  // remove a friendship (unfriend or cancel request)
  async removeFriendship(
    friendshipId: string,
    currentUserId: string,
  ): Promise<void> {
    const friendship = await this.friendshipRepo.findOneBy({
      id: friendshipId,
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    // only participants can remove the friendship
    if (
      friendship.requesterId !== currentUserId &&
      friendship.addresseeId !== currentUserId
    ) {
      throw new ForbiddenException(
        'You are not authorized to remove this friendship',
      );
    }

    await this.friendshipRepo.remove(friendship);
  }
}
