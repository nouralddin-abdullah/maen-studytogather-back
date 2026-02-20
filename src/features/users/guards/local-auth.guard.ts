import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// for login only to Auth with loginIdentifier and password - no jwt
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
