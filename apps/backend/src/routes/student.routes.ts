/**
 * Student Routes
 * API routes for student registration and management
 */

import { Router } from 'express';
import {
    registerStudent,
    getStudent,
    createReview,
} from '../controllers/student.controller.js';

const router = Router();

// Register or login student
router.post('/register', registerStudent);

// Get student by ID
router.get('/:id', getStudent);

// Create new project review for student
router.post('/:id/reviews', createReview);

export default router;
