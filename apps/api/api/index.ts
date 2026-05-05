// Vercel Serverless Function entry point
import app from '../src/index';

// Vercel routing: When user accesses /api/courses, Vercel calls this handler with /api/courses
// Express routes are defined with /api/ prefix, so we pass it directly
// But we also need to handle the case where Vercel might strip /api/
const handler = (req: any, res: any) => {
  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Handler] URL: ${req.url}, Original: ${req.originalUrl}`);
  }
  
  // Pass request directly to Express - routes already have /api/ prefix
  return app(req, res);
};

export default handler;

