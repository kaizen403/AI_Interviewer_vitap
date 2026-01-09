import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { testConnection } from './db/index.js';
import livekitRoutes from './routes/livekit.routes';
import projectReviewRoutes from './routes/project-review.routes';
import studentRoutes from './routes/student.routes.js';
import { apiLimiter } from './middleware/security';

const app: Application = express();
const PORT = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy - required when behind Render's proxy for rate-limiter to work
// This allows Express to get the real client IP from X-Forwarded-For header
app.set('trust proxy', 1);

// Security middleware - Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev
  crossOriginEmbedderPolicy: false, // Required for LiveKit
}));

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3050',
  'http://localhost:10000',
  'https://ai-interviewer-hpd4.onrender.com',
];

// In development, allow all origins
app.use(cors(isProduction ? {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Student-Id'],
} : {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Student-Id'],
}));

// Body parser
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// Routes
app.use('/api/livekit', livekitRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/project-review', projectReviewRoutes);

// Health check (no rate limiting)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({
    error: isProduction ? 'Internal server error' : err.message
  });
});

// Connect to PostgreSQL and start server
async function start() {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Failed to connect to PostgreSQL');
      process.exit(1);
    }

    // Validate required environment variables in production
    if (isProduction) {
      const requiredEnvVars = ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'OPENAI_API_KEY'];
      const missing = requiredEnvVars.filter(v => !process.env[v]);
      if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
      }
    }

    app.listen(PORT, () => {
      console.log(`🚀 Express server running on port ${PORT}`);
      console.log(`🔒 Security: ${isProduction ? 'Production' : 'Development'} mode`);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();
