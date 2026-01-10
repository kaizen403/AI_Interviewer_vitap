/**
 * Project Review Routes
 * API routes for project review functionality
 */

import { Router } from 'express';
import {
  getReviewByRoomId,
  uploadPPT,
  uploadMiddleware,
  getProjectReviewToken,
  studentJoined,
  completeProjectReview,
  getProjectReviewSummary,
  generateRoomJoinCode,
  getRoomByJoinCode,
  joinRoomAsParticipant,
} from '../controllers/project-review.controller.js';

const router: Router = Router();

// ============================================================================
// Multi-participant endpoints (must be before :roomId routes)
// ============================================================================

// Get room info by join code
router.get('/join/:code', getRoomByJoinCode);

// Join room as participant
router.post('/join/:code', joinRoomAsParticipant);

// ============================================================================
// Room-specific endpoints
// ============================================================================

// Get review by roomId
router.get('/:roomId', getReviewByRoomId);

// Upload PPT
router.post('/:roomId/upload', uploadMiddleware, uploadPPT);

// Get LiveKit token
router.post('/:roomId/token', getProjectReviewToken);

// Generate join code
router.post('/:roomId/join-code', generateRoomJoinCode);

// Student joined
router.post('/:roomId/joined', studentJoined);

// Complete review
router.post('/:roomId/complete', completeProjectReview);

// Get summary
router.get('/:roomId/summary', getProjectReviewSummary);

export default router;

