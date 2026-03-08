import { Expose, Type } from 'class-transformer';
import { FriendshipStatus } from '../enums/friendship-status.enum';
import { PublicUserDTO } from './public-user.dto';

export class FriendshipDTO {
  @Expose()
  id: string;

  @Expose()
  requesterId: string;

  @Expose()
  addresseeId: string;

  @Expose()
  status: FriendshipStatus;

  @Expose()
  @Type(() => PublicUserDTO)
  requester: PublicUserDTO;

  @Expose()
  @Type(() => PublicUserDTO)
  addressee: PublicUserDTO;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
