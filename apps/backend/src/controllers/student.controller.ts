/**
 * Student Controller
 * Handles student registration and authentication
 */

import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import crypto from 'crypto';

// VIT AP email domain
const ALLOWED_DOMAIN = 'vitapstudent.ac.in';

/**
 * Parse VIT email to extract name and registration number
 * Email format: name.regno@vitapstudent.ac.in
 * Example: rishi.23bce8982@vitapstudent.ac.in
 */
function parseVitEmail(email: string): { name: string; regNo: string } | null {
    const [localPart, domain] = email.toLowerCase().split('@');

    if (domain !== ALLOWED_DOMAIN) {
        return null;
    }

    const parts = localPart.split('.');
    if (parts.length < 2) {
        return null;
    }

    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const regNo = parts[parts.length - 1].toUpperCase();

    return { name, regNo };
}

/**
 * Register or login a student
 * POST /api/students/register
 * Now only requires name - email/regNo generated automatically
 */
export async function registerStudent(req: Request, res: Response) {
    try {
        const { name, email } = req.body;

        // Name is required
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ error: 'Name is required (at least 2 characters)' });
        }

        const studentName = name.trim();

        // Generate a unique identifier based on name
        const nameLower = studentName.toLowerCase().replace(/\s+/g, '');
        const uniqueId = crypto.randomBytes(4).toString('hex');
        const regNo = `${nameLower.substring(0, 4).toUpperCase()}${uniqueId.toUpperCase()}`;

        // Generate email (or use provided)
        let studentEmail = email?.toLowerCase()?.trim();
        if (!studentEmail) {
            studentEmail = `${nameLower}.${regNo.toLowerCase()}@review.local`;
        }

        // Check if student exists by email
        let student = await prisma.student.findUnique({
            where: { email: studentEmail },
        });

        if (student) {
            // Update name if different
            if (student.name !== studentName) {
                student = await prisma.student.update({
                    where: { id: student.id },
                    data: { name: studentName },
                });
            }
        } else {
            // Create new student
            student = await prisma.student.create({
                data: {
                    email: studentEmail,
                    name: studentName,
                    regNo,
                },
            });
        }

        // Check for existing active review
        const activeReview = await prisma.projectReview.findFirst({
            where: {
                studentId: student.id,
                status: { in: ['pending', 'upload_required', 'processing', 'ready', 'in_progress'] },
            },
        });

        res.json({
            success: true,
            student: {
                id: student.id,
                email: student.email,
                name: student.name,
                regNo: student.regNo,
            },
            activeReview: activeReview ? {
                id: activeReview.id,
                roomId: activeReview.roomId,
                status: activeReview.status,
                projectTitle: activeReview.projectTitle,
            } : null,
        });
    } catch (error) {
        console.error('[StudentController] Register error:', error);
        res.status(500).json({ error: 'Failed to register student' });
    }
}

/**
 * Get student by ID
 * GET /api/students/:id
 */
export async function getStudent(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                projectReviews: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json({ student });
    } catch (error) {
        console.error('[StudentController] Get student error:', error);
        res.status(500).json({ error: 'Failed to get student' });
    }
}

/**
 * Create a new project review session
 * POST /api/students/:id/reviews
 */
export async function createReview(req: Request, res: Response) {
    try {
        const { id: studentId } = req.params;
        const { projectTitle, projectDescription, githubUrl } = req.body;

        if (!projectTitle || typeof projectTitle !== 'string') {
            return res.status(400).json({ error: 'Project title is required' });
        }

        // Verify student exists
        const student = await prisma.student.findUnique({
            where: { id: studentId },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check for existing active review
        const existingReview = await prisma.projectReview.findFirst({
            where: {
                studentId,
                status: { in: ['pending', 'upload_required', 'processing', 'ready', 'in_progress'] },
            },
        });

        if (existingReview) {
            return res.status(400).json({
                error: 'You already have an active review session',
                review: {
                    id: existingReview.id,
                    roomId: existingReview.roomId,
                    status: existingReview.status,
                },
            });
        }

        // Generate unique room ID
        const roomId = `review-${student.regNo.toLowerCase()}-${Date.now().toString(36)}`;

        // Create review
        const review = await prisma.projectReview.create({
            data: {
                roomId,
                studentId,
                projectTitle: projectTitle.trim(),
                projectDescription: projectDescription?.trim() || null,
                githubUrl: githubUrl?.trim() || null,
                status: 'upload_required',
                duration: 30,
            },
        });

        res.json({
            success: true,
            review: {
                id: review.id,
                roomId: review.roomId,
                status: review.status,
                projectTitle: review.projectTitle,
            },
        });
    } catch (error) {
        console.error('[StudentController] Create review error:', error);
        res.status(500).json({ error: 'Failed to create review session' });
    }
}
