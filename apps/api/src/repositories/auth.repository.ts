/**
 * Auth Repository
 * Data access layer for authentication-related database operations
 */
import { prisma } from '../utils/prisma';
import { UserWithPassword, AuthUserInfo } from '../types/auth.types';

/**
 * User select configuration for auth responses
 */
const authUserSelect = {
  id: true,
  name: true,
  firstName: true,
  fatherName: true,
  familyName: true,
  email: true,
  role: true,
  profileComplete: true,
  gender: true,
  createdAt: true,
};

export class AuthRepository {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserWithPassword | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    }) as Promise<UserWithPassword | null>;
  }

  /**
   * Find user by provider and providerId
   */
  async findByProvider(provider: string, providerId: string): Promise<UserWithPassword | null> {
    return prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    }) as Promise<UserWithPassword | null>;
  }

  /**
   * Find user by email or provider
   */
  async findByEmailOrProvider(
    email: string,
    provider: string,
    providerId: string
  ): Promise<UserWithPassword | null> {
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { provider, providerId },
        ],
      },
    }) as Promise<UserWithPassword | null>;
  }

  /**
   * Create a new user
   */
  async createUser(data: {
    name: string;
    firstName?: string;
    fatherName?: string;
    familyName?: string;
    email: string;
    passwordHash: string | null;
    provider: string;
    providerId?: string | null;
    role: string;
    dateOfBirth?: Date;
    phone?: string;
    profession?: string;
    gender?: string;
    idNumber?: string;
    location?: string;
    profileComplete?: boolean;
  }): Promise<AuthUserInfo & { createdAt: Date }> {
    return prisma.user.create({
      data,
      select: authUserSelect,
    });
  }

  /**
   * Update user profile (for completing profile)
   */
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      firstName?: string;
      fatherName?: string;
      familyName?: string;
      dateOfBirth?: Date;
      phone?: string;
      profession?: string;
      gender?: string;
      idNumber?: string;
      location?: string;
      profileComplete?: boolean;
    }
  ): Promise<AuthUserInfo & { createdAt: Date }> {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: authUserSelect,
    });
  }

  /**
   * Update user OAuth provider information
   */
  async updateProvider(
    userId: string,
    provider: string,
    providerId: string
  ): Promise<UserWithPassword> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        provider,
        providerId,
      },
    }) as Promise<UserWithPassword>;
  }

  /**
   * Find user by ID (for current user endpoint)
   */
  async findById(userId: string): Promise<AuthUserInfo & { blocked: boolean; createdAt: Date } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        fatherName: true,
        familyName: true,
        email: true,
        role: true,
        profileComplete: true,
        gender: true,
        blocked: true,
        createdAt: true,
      },
    });
  }

  /**
   * Create refresh token
   */
  async createRefreshToken(token: string, userId: string, expiresAt: Date): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Find refresh token with user
   */
  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * Delete refresh token(s)
   */
  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token },
    });
  }
}

/**
 * Singleton instance
 */
export const authRepository = new AuthRepository();
