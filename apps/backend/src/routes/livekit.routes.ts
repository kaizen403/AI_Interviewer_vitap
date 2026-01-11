/**
 * LiveKit Routes
 * 
 * SECURITY NOTE: The public token endpoint has been removed.
 * Token generation is now only available through the interview routes
 * which require proper token validation.
 * 
 * Use POST /api/interview/:id/token instead.
 */

import { Router, type Router as RouterType } from 'express';
import livekitController from '../controllers/livekit.controller.js';
import { tokenLimiter, auditLog } from '../middleware/security.js';

const router: RouterType = Router();

/**
 * Internal token generation endpoint
 * This should only be called from other backend services, not directly from clients
 * For client token generation, use /api/interview/:id/token
 */
router.post('/token/internal',
  tokenLimiter,
  auditLog('internal_livekit_token'),
  (req, res, next) => {
    // Only allow internal requests (check for internal API key)
    const internalKey = req.headers['x-internal-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      // If no internal key configured, deny all requests in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Internal endpoint not configured' });
      }
      // In development, allow for testing
      return next();
    }

    if (internalKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid internal API key' });
    }

    next();
  },
  livekitController.generateToken
);

export default router;
