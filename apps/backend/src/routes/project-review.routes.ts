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
} from '../controllers/project-review.controller.js';

const router: Router = Router();

// Get review by roomId
router.get('/:roomId', getReviewByRoomId);

// Upload PPT
router.post('/:roomId/upload', uploadMiddleware, uploadPPT);

// Get LiveKit token
router.post('/:roomId/token', getProjectReviewToken);

// Student joined
router.post('/:roomId/joined', studentJoined);

// Complete review
router.post('/:roomId/complete', completeProjectReview);

// Get summary
router.get('/:roomId/summary', getProjectReviewSummary);

export default router;
