import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { prisma } from './utils/prisma';
import { LEGACY_VERCEL_FRONTEND_ORIGINS, PRODUCTION_FRONTEND_ORIGINS } from './constants/productionOrigins';

// Routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import coursesRoutes from './routes/courses';
import enrollmentsRoutes from './routes/enrollments';
import progressRoutes from './routes/progress';
import liveSessionsRoutes from './routes/liveSessions';
import quizzesRoutes from './routes/quizzes';
import categoriesRoutes from './routes/categories';
import modulesRoutes from './routes/modules';
import lessonsRoutes from './routes/lessons';
import examsRoutes from './routes/exams';
import homeworkRoutes from './routes/homework';
import gradesRoutes from './routes/grades';
import playlistsRoutes from './routes/playlists';
import resourcesRoutes from './routes/resources';
import reportsRoutes from './routes/reports';
import questionsRoutes from './routes/questions';
import homePromotionsRoutes from './routes/homePromotions';
import zoomLiveRoutes from './routes/zoomLive';
import siteContentRoutes from './routes/siteContent';
import studentInquiriesRoutes from './routes/studentInquiries';
import publicFaqRoutes from './routes/publicFaq';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow multiple origins for Vercel deployments
const getAllowedOrigins = () => {
  const origins: string[] = [];
  
  // Add FRONTEND_URL if set
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // Add NEXT_PUBLIC_FRONTEND_URL if set
  if (process.env.NEXT_PUBLIC_FRONTEND_URL) {
    origins.push(process.env.NEXT_PUBLIC_FRONTEND_URL);
  }
  
  // Add CORS_ORIGIN if set
  if (process.env.CORS_ORIGIN) {
    origins.push(process.env.CORS_ORIGIN);
  }
  
  origins.push(...PRODUCTION_FRONTEND_ORIGINS);
  origins.push(...LEGACY_VERCEL_FRONTEND_ORIGINS);
  
  // Localhost for development
  origins.push('http://localhost:3000');
  
  // Remove duplicates
  return [...new Set(origins)];
};

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, be strict; in development, allow all
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
}));

// Response compression - reduces payload size by 60-80%
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
}));

app.use(express.json());
app.use(cookieParser());

// Health check - support both root and /api/health for Vercel rewrites
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/', healthHandler);

// Routes - support both /api/* and /* for compatibility
// When accessed via /api/courses, Express receives /api/courses
// When accessed via /courses, Express receives /courses
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/users', usersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/courses', coursesRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/enrollments', enrollmentsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/progress', progressRoutes);
app.use('/api/live-sessions', liveSessionsRoutes);
app.use('/live-sessions', liveSessionsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/quizzes', quizzesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/categories', categoriesRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/modules', modulesRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/lessons', lessonsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/exams', examsRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/homework', homeworkRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/grades', gradesRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/playlists', playlistsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/reports', reportsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/questions', questionsRoutes);
app.use('/api/home-promotions', homePromotionsRoutes);
app.use('/home-promotions', homePromotionsRoutes);
app.use('/api/zoom-live', zoomLiveRoutes);
app.use('/zoom-live', zoomLiveRoutes);
app.use('/api/site-content', siteContentRoutes);
app.use('/site-content', siteContentRoutes);
app.use('/api/student-inquiries', studentInquiriesRoutes);
app.use('/student-inquiries', studentInquiriesRoutes);
app.use('/api/public-faq', publicFaqRoutes);
app.use('/public-faq', publicFaqRoutes);

// Resource routes (nested under courses and lessons)
app.use('/api/courses/:courseId/resources', resourcesRoutes);
app.use('/courses/:courseId/resources', resourcesRoutes);
app.use('/api/lessons/:lessonId/resources', resourcesRoutes);
app.use('/lessons/:lessonId/resources', resourcesRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server (only in non-serverless environments)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;

