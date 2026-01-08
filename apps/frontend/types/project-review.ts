/**
 * Project Review Types
 */

export interface ProjectReviewCandidate {
  name: string;
  email: string;
  photoUrl?: string;
}

export type ProjectReviewStatus = 
  | 'pending' 
  | 'upload_required' 
  | 'processing' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type ReviewEdgeCase = 
  | 'early' 
  | 'starting_soon' 
  | 'on_time' 
  | 'late' 
  | 'too_late' 
  | 'completed' 
  | 'cancelled'
  | 'expired';

export interface ProjectReview {
  _id: string;
  type: 'project_review';
  roomId: string;
  token: string;
  
  // Candidate
  candidate: ProjectReviewCandidate;
  
  // Project
  projectTitle: string;
  projectDescription?: string;
  
  // PPT Status
  pptFileName?: string;
  pptFileUrl?: string;
  pptFileSize?: number;
  pptUploaded: boolean;
  
  // Schedule
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  duration: number; // in minutes
  timezone?: string;
  
  // Status
  status: ProjectReviewStatus;
  edge_case?: ReviewEdgeCase;
  
  // Flags
  requiresUpload: boolean;
}

export interface UploadedFile {
  name: string;
  size: number;
  url: string;
}

export interface ProjectReviewSummary {
  review: {
    _id: string;
    projectTitle: string;
    status: ProjectReviewStatus;
    startedAt?: string;
    completedAt?: string;
    candidate: {
      name: string;
    };
  };
  report?: {
    overallScore?: number;
    understandingScore?: number;
    clarityScore?: number;
    depthScore?: number;
    aiDetectionResult?: string;
    strengths?: string[];
    improvements?: string[];
    summary?: string;
  };
}
