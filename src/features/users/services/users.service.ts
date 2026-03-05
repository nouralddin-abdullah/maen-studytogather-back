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
import { Field, Sex } from '@shared/types/index';
import { DataSource } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private storageService: StorageService,
    private dataSource: DataSource,
  ) {}

  //create user
  async create(
    email: string,
    username: string,
    nickName: string,
    password: string,
    avatarFile?: { buffer: Buffer; originalname: string; mimetype: string },
    country?: string | null,
    field?: Field | null,
    gender?: Sex | null,
    timezone?: string,
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
      country,
      field,
      gender,
      ...(timezone && { timezone }),
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
    profileBackgroundFile?: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
    },
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
    if (profileBackgroundFile) {
      const key = `profile-backgrounds/${user.id}-${Date.now()}`;
      const result = await this.storageService.upload({
        key,
        body: profileBackgroundFile.buffer,
        contentType: profileBackgroundFile.mimetype,
      });
      user.profileBackgroundUrl = result.url;
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

  async getHeatmap(userId: string, targetYear: number) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;
    const rawData = await this.dataSource.query(
      `
      SELECT 
        to_char(d.date, 'YYYY-MM-DD') AS "date", 
        COALESCE(log."totalMinutes", 0) AS "minutes"
      FROM generate_series(
        $2::date, -- Start Date (Jan 1st)
        $3::date, -- End Date (Dec 31st)
        '1 day'::interval
      ) AS d(date)
      LEFT JOIN "daily_study_log" log 
        ON log."userId" = $1 AND log."date" = d.date::date
      ORDER BY d.date ASC;
      `,
      [userId, startDate, endDate],
    );
    const formattedData = rawData.map((row: any) => ({
      date: row.date,
      minutes: Number(row.minutes),
    }));

    return {
      year: targetYear,
      data: formattedData,
    };
  }
}
