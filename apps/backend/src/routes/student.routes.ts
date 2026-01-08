/**
 * Student Routes
 * API routes for student registration and management
 */

import { Router, type Router as RouterType } from 'express';
import {
    registerStudent,
    getStudent,
    createReview,
} from '../controllers/student.controller.js';

const router: RouterType = Router();

// Register or login student
router.post('/register', registerStudent);

// Get student by ID
router.get('/:id', getStudent);

// Create new project review for student
router.post('/:id/reviews', createReview);

export default router;
