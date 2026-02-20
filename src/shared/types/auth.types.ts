import { Role } from './roles.enum';

// JWT payload
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  role: Role;
}

// authenticated data of user attached on req
export interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
  role: Role;
}

// response after login / signup
export interface TokenResponse {
  accessToken: string;
  expiresIn: string;
  tokenType: string;
}

// google OAuth profile from strategy
export interface GoogleProfile {
  email: string;
  displayName: string;
  avatar?: string;
}
