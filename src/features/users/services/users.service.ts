import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

// Feature imports
import { User } from '../entities/user.entity';

// Shared imports
import {
  PaginationQuery,
  PaginatedResponse,
  createPaginatedResponse,
} from '@shared/dto';

// Other feature imports
import { StorageService } from '@features/storage';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private storageService: StorageService,
  ) {}

  //create user
  async create(
    email: string,
    username: string,
    nickName: string,
    password: string,
    avatarFile?: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<User> {
    // duplicate email?
    if (await this.findOneByEmail(email)) {
      throw new ConflictException('This email is already in use');
    }
    // duplicate username?
    if (await this.findOneByUsername(username)) {
      throw new ConflictException('This username is already taken');
    }

    // since all the validations are OKAY
    const user = this.userRepo.create({
      id: randomUUID(),
      email,
      username,
      nickName,
      password,
    });
    // now we upload the file if provided
    if (avatarFile) {
      const key = `avatars/${user.id}-${Date.now()}`;
      const result = await this.storageService.upload({
        key,
        body: avatarFile.buffer,
        contentType: avatarFile.mimetype,
      });
      user.avatar = result.url;
    }

    // save it now
    const savedUser = await this.userRepo.save(user);
    return savedUser;
  }

  // find user with id
  async findOne(id: string): Promise<User | null> {
    return await this.userRepo.findOneBy({ id });
  }

  // find user by email - to lower case so not case sensitive
  async findOneByEmail(email: string): Promise<User | null> {
    return await this.userRepo.findOneBy({ email: email.toLowerCase() });
  }

  // find user by username - to lower case so not case sensitive
  async findOneByUsername(username: string): Promise<User | null> {
    return await this.userRepo.findOneBy({ username: username.toLowerCase() });
  }

  async findByResetToken(hashedToken: string): Promise<User | null> {
    return await this.userRepo.findOneBy({ passwordResetToken: hashedToken });
  }

  // make a login with Identifier (email or username)
  async findByLoginIdentifier(loginIdentifier: string): Promise<User | null> {
    const identifier = loginIdentifier.toLowerCase();

    // if it contains '@' that mean it's email
    if (identifier.includes('@')) {
      return await this.findOneByEmail(identifier);
    }
    return await this.findOneByUsername(identifier);
  }

  // update user with optional attr
  async update(
    id: string,
    attrs: Partial<User>,
    avatarFile?: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, attrs);
    if (avatarFile) {
      const key = `avatars/${user.id}-${Date.now()}`;
      const result = await this.storageService.upload({
        key,
        body: avatarFile.buffer,
        contentType: avatarFile.mimetype,
      });
      user.avatar = result.url;
    }

    // save it now
    return await this.userRepo.save(user);
  }

  async save(user: User): Promise<User> {
    return await this.userRepo.save(user);
  }

  // delete user (hard delete), you can use SoftRemove if you want.
  async remove(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return await this.userRepo.remove(user);
  }

  // find all users (paginated)
  async findAll(query: PaginationQuery): Promise<PaginatedResponse<User>> {
    const { page, limit, sortBy, order } = query;

    const [data, total] = await this.userRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: order.toUpperCase() as 'ASC' | 'DESC' },
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  // create user from OAuth provider (skips duplicate - already done in AuthService)
  async createFromOAuth(data: {
    email: string;
    username: string;
    nickName: string;
    password: string;
    avatar?: string;
  }): Promise<User> {
    const user = this.userRepo.create({
      id: randomUUID(),
      email: data.email,
      username: data.username,
      nickName: data.nickName,
      password: data.password,
      avatar: data.avatar,
    });

    return await this.userRepo.save(user);
  }
}
