/**
 * Interview Hook Types
 * 
 * Type definitions for interview-related hooks
 */

// Interview stage
export type InterviewStage = 'lobby' | 'meeting' | 'ended';

// Media settings for the interview
export interface MediaSettings {
  camera: boolean;
  mic: boolean;
}

// useInterviewRoom options
export interface UseInterviewRoomOptions {
  autoConnect?: boolean;
}

// useInterviewRoom return type
export interface UseInterviewRoomReturn {
  // Stage management
  stage: InterviewStage;
  
  // LiveKit connection
  livekitToken: string | null;
  
  // Media settings
  mediaSettings: MediaSettings;
  
  // Loading and error states
  isLoading: boolean;
  isJoining: boolean;
  error: string | null;
  
  // Actions
  joinInterview: (cameraEnabled: boolean, micEnabled: boolean) => Promise<void>;
  endInterview: () => Promise<void>;
  leaveInterview: () => void;
  resetError: () => void;
  setMediaSettings: (settings: Partial<MediaSettings>) => void;
}
