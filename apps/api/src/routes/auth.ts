/**
 * Auth Routes
 * HTTP layer - delegates to AuthManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { authManager } from '../managers/auth.manager';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  appleAuthSchema,
  completeProfileSchema,
} from '../schemas/auth.schema';

const router = express.Router();

/**
 * POST /register - Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const result = await authManager.register(data);

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: error.errors,
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'فشل التسجيل' });
  }
});

/**
 * POST /login - Login with email/username and password
 */
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await authManager.login(data);

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.data!.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return response without refreshToken in body (it's in the cookie)
    const { refreshToken, ...responseData } = result.data!;
    res.json(responseData);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: error.errors,
      });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'فشل تسجيل الدخول' });
  }
});

/**
 * POST /google - Google OAuth login
 */
router.post('/google', async (req, res) => {
  try {
    const data = googleAuthSchema.parse(req.body);

    const result = await authManager.googleLogin(data);

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.data!.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Return response without refreshToken in body (it's in the cookie)
    const { refreshToken, ...responseData } = result.data!;
    res.json(responseData);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: error.errors,
      });
    }
    console.error('Google OAuth error:', error);
    res.status(500).json({ message: error.message || 'فشل تسجيل الدخول عبر Google' });
  }
});

/**
 * POST /apple - Apple OAuth login
 */
router.post('/apple', async (req, res) => {
  try {
    const data = appleAuthSchema.parse(req.body);

    const result = await authManager.appleLogin(data);

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.data!.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Return response without refreshToken in body (it's in the cookie)
    const { refreshToken, ...responseData } = result.data!;
    res.json(responseData);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: error.errors,
      });
    }
    console.error('Apple OAuth error:', error);
    res.status(500).json({ message: error.message || 'فشل تسجيل الدخول عبر Apple' });
  }
});

/**
 * POST /refresh - Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'رمز التحديث مطلوب' });
    }

    const result = await authManager.refreshAccessToken(refreshToken);

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'رمز التحديث غير صالح' });
  }
});

/**
 * POST /logout - Logout user
 */
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    const result = await authManager.logout(refreshToken);

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ message: error.message || 'فشل تسجيل الخروج' });
  }
});

/**
 * POST /complete-profile - Complete user profile (for OAuth users)
 */
router.post('/complete-profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = completeProfileSchema.parse(req.body);

    const result = await authManager.completeProfile(
      { userId: req.user!.userId, role: req.user!.role },
      data
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: error.errors,
      });
    }
    console.error('Complete profile error:', error);
    res.status(500).json({ message: error.message || 'فشل إكمال الملف الشخصي' });
  }
});

/**
 * GET /me - Get current user
 */
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await authManager.getCurrentUser({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب بيانات المستخدم' });
  }
});

export default router;
