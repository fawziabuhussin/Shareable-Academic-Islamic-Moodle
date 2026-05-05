/**
 * Auth Manager
 * Business logic layer for authentication management
 */
import { authRepository } from '../repositories/auth.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import {
  RegisterDTO,
  CompleteProfileDTO,
  LoginDTO,
  GoogleAuthDTO,
  AppleAuthDTO,
  AuthResponse,
  RegisterResponse,
  RefreshTokenResponse,
  TokenPayload,
  AuthUserInfo,
  OAuthPayload,
} from '../types/auth.types';
import { AuthContext } from '../types/common.types';
import { oldGradeManager } from './oldGrade.manager';

/**
 * Result types for manager operations
 */
export interface RegisterResult {
  success: boolean;
  data?: RegisterResponse;
  error?: { status: number; message: string };
}

export interface LoginResult {
  success: boolean;
  data?: AuthResponse;
  error?: { status: number; message: string };
}

export interface RefreshResult {
  success: boolean;
  data?: RefreshTokenResponse;
  error?: { status: number; message: string };
}

export interface LogoutResult {
  success: boolean;
  error?: { status: number; message: string };
}

export interface CurrentUserResult {
  success: boolean;
  data?: AuthUserInfo & { blocked: boolean; createdAt: Date };
  error?: { status: number; message: string };
}

export interface CompleteProfileResult {
  success: boolean;
  data?: { message: string; user: AuthUserInfo };
  error?: { status: number; message: string };
}

export class AuthManager {
  /**
   * Register a new user
   */
  async register(data: RegisterDTO): Promise<RegisterResult> {
    const {
      firstName,
      fatherName,
      familyName,
      email,
      password,
      dateOfBirth,
      phone,
      profession,
      gender,
      idNumber,
      location,
    } = data;

    // Concatenate name from parts
    const name = `${firstName} ${fatherName} ${familyName}`;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const existing = await authRepository.findByEmail(normalizedEmail);
    if (existing) {
      return {
        success: false,
        error: { status: 400, message: 'البريد الإلكتروني مسجل بالفعل' },
      };
    }

    // Create user with all profile fields
    const passwordHash = await hashPassword(password);
    const user = await authRepository.createUser({
      name,
      firstName,
      fatherName,
      familyName,
      email: normalizedEmail,
      passwordHash,
      provider: 'EMAIL',
      role: 'STUDENT',
      dateOfBirth,
      phone,
      profession,
      gender,
      idNumber,
      location,
      profileComplete: true,
    });

    // Import old grades for newly registered user (fire-and-forget, never blocks signup)
    if (idNumber) {
      oldGradeManager.importOldGradesForUser(user.id, idNumber).catch((err) => {
        console.error('[Auth] Error importing old grades during registration:', err);
      });
    }

    return {
      success: true,
      data: {
        message: 'تم التسجيل بنجاح',
        user,
      },
    };
  }

  /**
   * Login with email/username and password
   */
  async login(data: LoginDTO): Promise<LoginResult> {
    const { email, username, password } = data;

    // Find user by email or username (email takes priority)
    // Normalize to lowercase for case-insensitive matching
    let user = null;
    if (email) {
      user = await authRepository.findByEmail(email.toLowerCase());
    } else if (username) {
      // Try to find by email (treating username as email)
      user = await authRepository.findByEmail(username.toLowerCase());
    }

    if (!user) {
      return {
        success: false,
        error: { status: 401, message: 'بيانات الاعتماد غير صالحة' },
      };
    }

    if (user.blocked) {
      return {
        success: false,
        error: { status: 403, message: 'تم حظر حسابك. يرجى التواصل مع الإدارة.' },
      };
    }

    // Verify password (only for email/password users)
    if (!user.passwordHash) {
      return {
        success: false,
        error: { status: 401, message: 'الرجاء استخدام تسجيل الدخول عبر OAuth لهذا الحساب' },
      };
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return {
        success: false,
        error: { status: 401, message: 'بيانات الاعتماد غير صالحة' },
      };
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token
    await authRepository.createRefreshToken(
      refreshToken,
      user.id,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    );

    // Get full user info including profileComplete
    const fullUser = await authRepository.findById(user.id);

    return {
      success: true,
      data: {
        message: 'تم تسجيل الدخول بنجاح',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          firstName: fullUser?.firstName,
          fatherName: fullUser?.fatherName,
          familyName: fullUser?.familyName,
          email: user.email,
          role: user.role,
          profileComplete: fullUser?.profileComplete ?? false,
          gender: fullUser?.gender ?? null,
        },
      },
    };
  }

  /**
   * Google OAuth login
   */
  async googleLogin(data: GoogleAuthDTO): Promise<LoginResult> {
    const { token } = data;

    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      // Verify the token
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return {
          success: false,
          error: { status: 401, message: 'رمز Google غير صالح' },
        };
      }

      const { sub: providerId, email, name } = payload;

      // Find or create user
      let user = await authRepository.findByEmailOrProvider(email.toLowerCase(), 'GOOGLE', providerId);

      let isNewUser = false;
      if (!user) {
        // Create new user with profileComplete: false (OAuth users need to complete profile)
        const newUser = await authRepository.createUser({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          provider: 'GOOGLE',
          providerId,
          passwordHash: null,
          role: 'STUDENT',
          profileComplete: false,
        });
        user = { ...newUser, passwordHash: null, blocked: false, provider: 'GOOGLE', providerId };
        isNewUser = true;
      } else if (user.provider !== 'GOOGLE' || user.providerId !== providerId) {
        // Update existing user to link Google account
        user = await authRepository.updateProvider(user.id, 'GOOGLE', providerId);
      }

      if (user.blocked) {
        return {
          success: false,
          error: { status: 403, message: 'تم حظر حسابك. يرجى التواصل مع الإدارة.' },
        };
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Save refresh token
      await authRepository.createRefreshToken(
        refreshToken,
        user.id,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      // Get full user info including profileComplete
      const fullUser = await authRepository.findById(user.id);

      return {
        success: true,
        data: {
          message: 'تم تسجيل الدخول بنجاح',
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            firstName: fullUser?.firstName,
            fatherName: fullUser?.fatherName,
            familyName: fullUser?.familyName,
            email: user.email,
            role: user.role,
            profileComplete: fullUser?.profileComplete ?? false,
            gender: fullUser?.gender ?? null,
          },
        },
      };
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      return {
        success: false,
        error: { status: 500, message: 'فشل تسجيل الدخول عبر Google' },
      };
    }
  }

  /**
   * Apple OAuth login
   */
  async appleLogin(data: AppleAuthDTO): Promise<LoginResult> {
    const { identityToken, user: appleUser } = data;

    try {
      // Verify Apple token (simplified - in production, verify with Apple's public keys)
      const decoded = jwt.decode(identityToken) as OAuthPayload;

      if (!decoded || !decoded.email) {
        return {
          success: false,
          error: { status: 401, message: 'رمز Apple غير صالح' },
        };
      }

      const { sub: providerId, email } = decoded;
      const name = appleUser?.name || email.split('@')[0];

      // Find or create user
      let user = await authRepository.findByEmailOrProvider(email.toLowerCase(), 'APPLE', providerId);

      if (!user) {
        // Create new user with profileComplete: false (OAuth users need to complete profile)
        const newUser = await authRepository.createUser({
          name,
          email: email.toLowerCase(),
          provider: 'APPLE',
          providerId,
          passwordHash: null,
          role: 'STUDENT',
          profileComplete: false,
        });
        user = { ...newUser, passwordHash: null, blocked: false, provider: 'APPLE', providerId };
      } else if (user.provider !== 'APPLE' || user.providerId !== providerId) {
        // Update existing user to link Apple account
        user = await authRepository.updateProvider(user.id, 'APPLE', providerId);
      }

      if (user.blocked) {
        return {
          success: false,
          error: { status: 403, message: 'تم حظر حسابك. يرجى التواصل مع الإدارة.' },
        };
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Save refresh token
      await authRepository.createRefreshToken(
        refreshToken,
        user.id,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      // Get full user info including profileComplete
      const fullUser = await authRepository.findById(user.id);

      return {
        success: true,
        data: {
          message: 'تم تسجيل الدخول بنجاح',
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            firstName: fullUser?.firstName,
            fatherName: fullUser?.fatherName,
            familyName: fullUser?.familyName,
            email: user.email,
            role: user.role,
            profileComplete: fullUser?.profileComplete ?? false,
            gender: fullUser?.gender ?? null,
          },
        },
      };
    } catch (error: any) {
      console.error('Apple OAuth error:', error);
      return {
        success: false,
        error: { status: 500, message: 'فشل تسجيل الدخول عبر Apple' },
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Check if token exists in database
      const tokenRecord = await authRepository.findRefreshToken(refreshToken);

      if (!tokenRecord || tokenRecord.expiresAt < new Date() || tokenRecord.user.blocked) {
        return {
          success: false,
          error: { status: 401, message: 'رمز التحديث غير صالح أو منتهي الصلاحية' },
        };
      }

      // Generate new access token
      const tokenPayload: TokenPayload = {
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);

      // Get full user info including profileComplete
      const fullUser = await authRepository.findById(tokenRecord.user.id);

      return {
        success: true,
        data: {
          accessToken,
          user: {
            id: tokenRecord.user.id,
            name: tokenRecord.user.name,
            firstName: fullUser?.firstName,
            fatherName: fullUser?.fatherName,
            familyName: fullUser?.familyName,
            email: tokenRecord.user.email,
            role: tokenRecord.user.role,
            profileComplete: fullUser?.profileComplete ?? false,
            gender: fullUser?.gender ?? null,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: { status: 401, message: 'رمز التحديث غير صالح' },
      };
    }
  }

  /**
   * Complete user profile (for OAuth users)
   */
  async completeProfile(auth: AuthContext, data: CompleteProfileDTO): Promise<CompleteProfileResult> {
    const {
      firstName,
      fatherName,
      familyName,
      dateOfBirth,
      phone,
      profession,
      gender,
      idNumber,
      location,
    } = data;

    // Concatenate name from parts
    const name = `${firstName} ${fatherName} ${familyName}`;

    // Update user profile
    const user = await authRepository.updateProfile(auth.userId, {
      name,
      firstName,
      fatherName,
      familyName,
      dateOfBirth,
      phone,
      profession,
      gender,
      idNumber,
      location,
      profileComplete: true,
    });

    // Import old grades for OAuth user who just completed profile (fire-and-forget)
    if (idNumber) {
      oldGradeManager.importOldGradesForUser(auth.userId, idNumber).catch((err) => {
        console.error('[Auth] Error importing old grades during profile completion:', err);
      });
    }

    return {
      success: true,
      data: {
        message: 'تم إكمال الملف الشخصي بنجاح',
        user,
      },
    };
  }

  /**
   * Logout user
   */
  async logout(refreshToken?: string): Promise<LogoutResult> {
    if (refreshToken) {
      await authRepository.deleteRefreshToken(refreshToken);
    }

    return {
      success: true,
    };
  }

  /**
   * Get current user
   */
  async getCurrentUser(auth: AuthContext): Promise<CurrentUserResult> {
    const user = await authRepository.findById(auth.userId);

    if (!user || user.blocked) {
      return {
        success: false,
        error: { status: 404, message: 'المستخدم غير موجود' },
      };
    }

    return {
      success: true,
      data: user,
    };
  }
}

/**
 * Singleton instance
 */
export const authManager = new AuthManager();
