import { Exclude, Expose, Type } from 'class-transformer';
import { FriendshipDTO } from './friendship.dto';
import { PublicUserDTO } from './public-user.dto';

export class EnrichedFriendshipDTO extends FriendshipDTO {
  @Exclude()
  declare requester: PublicUserDTO;

  @Exclude()
  declare addressee: PublicUserDTO;

  @Expose()
  isOnline: boolean;

  @Expose()
  @Type(() => PublicUserDTO)
  friendProfile: PublicUserDTO;

  @Expose()
  roomId?: string;

  @Expose()
  roomName?: string;

  @Expose()
  inviteCode?: string;
}
