/**
 * Auth-specific types and DTOs
 */

/**
 * DTO for user registration
 */
export interface RegisterDTO {
  // Step 1 - Name fields
  firstName: string;
  fatherName: string;
  familyName: string;
  email: string;
  password: string;

  // Step 2 - Profile fields
  dateOfBirth: Date;
  phone: string;
  profession: string;
  gender: 'MALE' | 'FEMALE';
  idNumber: string;
  location: string;
}

/**
 * DTO for completing profile (OAuth users)
 */
export interface CompleteProfileDTO {
  firstName: string;
  fatherName: string;
  familyName: string;
  dateOfBirth: Date;
  phone: string;
  profession: string;
  gender: 'MALE' | 'FEMALE';
  idNumber: string;
  location: string;
}

/**
 * DTO for user login
 */
export interface LoginDTO {
  email?: string;
  username?: string;
  password: string;
}

/**
 * DTO for Google OAuth login
 */
export interface GoogleAuthDTO {
  token: string;
}

/**
 * DTO for Apple OAuth login
 */
export interface AppleAuthDTO {
  identityToken: string;
  user?: {
    name?: string;
  };
}

/**
 * User information returned after authentication
 */
export interface AuthUserInfo {
  id: string;
  name: string;
  firstName?: string | null;
  fatherName?: string | null;
  familyName?: string | null;
  email: string;
  role: string;
  profileComplete: boolean;
  /** MALE / FEMALE — used for gender-specific UI (e.g. announcements) */
  gender?: string | null;
}

/**
 * Token payload for JWT generation
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Authentication response with tokens
 */
export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUserInfo;
}

/**
 * Registration response
 */
export interface RegisterResponse {
  message: string;
  user: AuthUserInfo & {
    createdAt: Date;
  };
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  user: AuthUserInfo;
}

/**
 * User with password hash (for internal use)
 */
export interface UserWithPassword {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string | null;
  blocked: boolean;
  provider: string | null;
  providerId: string | null;
}

/**
 * Decoded OAuth payload
 */
export interface OAuthPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}
