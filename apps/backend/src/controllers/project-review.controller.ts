/**
 * Project Review Controller
 * 
 * Handles project review validation, PPT upload, and status updates
 */

import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AccessToken, RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// LiveKit credentials
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'http://localhost:7880';

// Initialize LiveKit clients
const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const agentDispatch = new AgentDispatchClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// PPT upload config
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.ppt', '.pptx', '.pdf'];
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'ppt');

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ppt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
};

import type { RequestHandler } from 'express';

export const uploadMiddleware: RequestHandler = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('ppt');

/**
 * Get review by roomId (for student-based access)
 * GET /api/project-review/:roomId
 */
export async function getReviewByRoomId(req: Request, res: Response) {
  try {
    const { roomId } = req.params;
    const studentId = req.headers['x-student-id'] as string;

    const review = await prisma.projectReview.findUnique({
      where: { roomId },
      include: { student: true },
    });

    if (!review) {
      return res.status(404).json({ error: 'Project review not found' });
    }

    // Verify student owns this review
    if (studentId && review.studentId !== studentId) {
      return res.status(403).json({ error: 'Not authorized to access this review' });
    }

    return res.json({
      id: review.id,
      roomId: review.roomId,
      projectTitle: review.projectTitle,
      projectDescription: review.projectDescription,
      githubUrl: review.githubUrl,
      pptFileName: review.pptFileName,
      pptFileUrl: review.pptFileUrl,
      pptUploaded: !!review.pptFileName,
      pptContent: review.pptContent,
      status: review.status,
      startedAt: review.startedAt,
      completedAt: review.completedAt,
      duration: review.duration,
      student: review.student ? {
        name: review.student.name,
        email: review.student.email,
        regNo: review.student.regNo,
      } : null,
    });
  } catch (error) {
    console.error('Get review error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Upload PPT file
 * POST /api/project-review/:roomId/upload
 */
export async function uploadPPT(req: Request, res: Response) {
  try {
    const { roomId } = req.params;
    const studentId = req.headers['x-student-id'] as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Find review by roomId
    const review = await prisma.projectReview.findUnique({
      where: { roomId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Project review not found' });
    }

    // Verify student owns this review
    if (studentId && review.studentId !== studentId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Extract PPT content using officeparser (works server-side)
    let pptContent = '';
    try {
      const officeparser = await import('officeparser');
      const filePath = path.join(UPLOAD_DIR, file.filename);

      // Parse the PPT/PPTX file - returns string when called with just path
      const parsed = await officeparser.parseOffice(filePath);
      pptContent = typeof parsed === 'string' ? parsed : String(parsed || '');

      // Clean up the content
      if (pptContent) {
        pptContent = pptContent
          .split('\n')
          .filter((line: string) => line.trim())
          .join('\n');
      }

      console.log(`[PPT Upload] Extracted ${pptContent.length} chars from PPT`);
    } catch (e) {
      console.warn('[PPT Upload] Could not extract PPT content:', e);
      pptContent = `File: ${file.originalname}\nSize: ${file.size} bytes\n(Content extraction failed)`;
    }

    // Update the project review with file info and content
    const updated = await prisma.projectReview.update({
      where: { id: review.id },
      data: {
        pptFileName: file.originalname,
        pptFileUrl: `/uploads/ppt/${file.filename}`,
        pptFileSize: file.size,
        pptUploadedAt: new Date(),
        pptContent,
        status: 'processing', // Set to processing while we index
      },
    });

    // Index PPT content for RAG (async - don't wait)
    if (pptContent && pptContent.length > 50) {
      indexPptForRag(review.id, pptContent).then(count => {
        console.log(`[PPT Upload] Indexed ${count} chunks for review ${review.id}`);
        // Update status to ready after indexing
        prisma.projectReview.update({
          where: { id: review.id },
          data: { status: 'ready' },
        }).catch(console.error);
      }).catch(err => {
        console.error('[PPT Upload] RAG indexing failed:', err);
        // Still mark as ready even if indexing fails
        prisma.projectReview.update({
          where: { id: review.id },
          data: { status: 'ready' },
        }).catch(console.error);
      });
    } else {
      // Mark as ready immediately if no content to index
      await prisma.projectReview.update({
        where: { id: review.id },
        data: { status: 'ready' },
      });
    }

    return res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        name: file.originalname,
        size: file.size,
        url: `/uploads/ppt/${file.filename}`,
      },
      status: 'processing',
      contentExtracted: pptContent.length > 50,
    });
  } catch (error) {
    console.error('Upload PPT error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}

// Helper function to index PPT content for RAG
async function indexPptForRag(reviewId: string, pptContent: string): Promise<number> {
  try {
    const { indexPptContent } = await import('../services/rag/index.js');
    return await indexPptContent(reviewId, pptContent);
  } catch (error) {
    console.error('[RAG] Indexing error:', error);
    return 0;
  }
}

/**
 * Generate LiveKit token for project review
 * POST /api/project-review/:roomId/token
 */
export async function getProjectReviewToken(req: Request, res: Response) {
  try {
    const { roomId } = req.params;
    const studentId = req.headers['x-student-id'] as string;

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(500).json({ error: 'LiveKit not configured' });
    }

    // Get review details
    const review = await prisma.projectReview.findUnique({
      where: { roomId },
      include: { student: true },
    });

    if (!review) {
      return res.status(404).json({ error: 'Project review not found' });
    }

    // Verify student owns this review
    if (studentId && review.studentId !== studentId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if PPT has been uploaded
    if (!review.pptFileName) {
      return res.status(400).json({
        error: 'PPT must be uploaded before joining',
        requiresUpload: true,
      });
    }

    // Create or get the room
    try {
      await roomService.createRoom({
        name: roomId,
        emptyTimeout: 600, // 10 minutes
        maxParticipants: 2,
        metadata: JSON.stringify({
          type: 'project_review',
          agentType: 'project-review',
          reviewId: review.id,
          projectTitle: review.projectTitle,
          projectDescription: review.projectDescription,
          githubUrl: review.githubUrl,
          pptUrl: review.pptFileUrl,
          pptContent: review.pptContent,
          studentId: review.studentId,
          studentName: review.student?.name,
          studentRegNo: review.student?.regNo,
        }),
      });
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }

    // Generate access token for student
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `student-${review.student?.regNo || crypto.randomBytes(4).toString('hex')}`,
      name: review.student?.name || 'Student',
      ttl: 3600, // 1 hour
    });

    token.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return res.json({
      token: await token.toJwt(),
      review: {
        id: review.id,
        projectTitle: review.projectTitle,
        studentName: review.student?.name,
      },
    });
  } catch (error) {
    console.error('Generate token error:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}

/**
 * Student joined the project review
 * POST /api/project-review/:roomId/joined
 */
export async function studentJoined(req: Request, res: Response) {
  try {
    const { roomId } = req.params;

    // Update status to in_progress
    const updated = await prisma.projectReview.update({
      where: { roomId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    if (!updated) {
      return res.status(404).json({ error: 'Project review not found' });
    }

    // Dispatch the project review agent
    try {
      await agentDispatch.createDispatch(roomId, 'pendent-voice-agent');
      console.log(`[ProjectReview] Agent dispatched for room: ${roomId}`);
    } catch (error) {
      console.error('[ProjectReview] Failed to dispatch agent:', error);
      // Continue anyway - agent may already be connected
    }

    return res.json({
      success: true,
      message: 'Project review started',
      status: 'in_progress',
    });
  } catch (error) {
    console.error('Student joined error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Complete project review
 * POST /api/project-review/:roomId/complete
 */
export async function completeProjectReview(req: Request, res: Response) {
  try {
    const { roomId } = req.params;

    const updated = await prisma.projectReview.update({
      where: { roomId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    if (!updated) {
      return res.status(404).json({ error: 'Project review not found' });
    }

    return res.json({
      success: true,
      message: 'Project review completed',
    });
  } catch (error) {
    console.error('Complete project review error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get project review summary (for ended page)
 * GET /api/project-review/:roomId/summary
 */
export async function getProjectReviewSummary(req: Request, res: Response) {
  try {
    const { roomId } = req.params;

    const review = await prisma.projectReview.findUnique({
      where: { roomId },
      include: {
        student: true,
        report: true,
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Project review not found' });
    }

    return res.json({
      review: {
        id: review.id,
        projectTitle: review.projectTitle,
        status: review.status,
        startedAt: review.startedAt,
        completedAt: review.completedAt,
        student: {
          name: review.student?.name ?? 'Unknown',
          regNo: review.student?.regNo,
        },
      },
      report: review.report ? {
        overallScore: review.report.overallScore,
        understandingScore: review.report.understandingScore,
        clarityScore: review.report.clarityScore,
        depthScore: review.report.depthScore,
        aiDetectionResult: review.report.aiDetectionResult,
        strengths: review.report.strengths,
        improvements: review.report.improvements,
        summary: review.report.summary,
      } : null,
    });
  } catch (error) {
    console.error('Get summary error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
