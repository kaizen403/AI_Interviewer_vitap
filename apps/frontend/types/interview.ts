/**
 * Interview Types
 */

export interface Candidate {
  name: string;
  email: string;
  photoUrl?: string;
}

export interface Interviewer {
  name: string;
  photoUrl?: string;
}

export type EdgeCase = 
  | 'early' 
  | 'starting_soon' 
  | 'on_time' 
  | 'late' 
  | 'too_late' 
  | 'completed' 
  | 'cancelled';

export interface Interview {
  _id: string;
  roomId: string;
  token: string;
  
  // People
  candidate: Candidate;
  interviewer: Interviewer;
  
  // Job
  position: string;
  jobDescription?: string;
  
  // Schedule
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  duration: number; // in minutes
  timezone?: string;
  
  // Status
  status: InterviewStatus;
  
  // Edge case from server (timing validation)
  edge_case?: EdgeCase;
  
  // Proctoring
  proctoringEnabled?: boolean;
}

export type InterviewStatus = 
  | 'scheduled' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled'
  | 'no_show';

export type ArrivalStatus = 'early' | 'on_time' | 'late' | 'too_late';

/**
 * Calculate arrival status based on scheduled time
 */
export function getArrivalStatus(scheduledAt: string): ArrivalStatus {
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);
  
  if (diffMinutes > 15) return 'early'; // More than 15 mins early
  if (diffMinutes >= -5) return 'on_time'; // Within 5 mins before/after
  if (diffMinutes >= -30) return 'late'; // Up to 30 mins late
  return 'too_late'; // More than 30 mins late
}

/**
 * Get time until interview starts (in seconds)
 */
export function getTimeUntilStart(scheduledAt: string): number {
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  return Math.max(0, Math.floor((scheduled.getTime() - now.getTime()) / 1000));
}

