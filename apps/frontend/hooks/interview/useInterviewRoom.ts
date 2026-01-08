'use client';

/**
 * useInterviewRoom Hook
 * 
 * Production-level hook for managing interview room lifecycle:
 * - Stage transitions (lobby -> meeting -> ended)
 * - LiveKit token management
 * - Room connection state
 * - Error handling and recovery
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getInterviewToken, completeInterview } from '@/lib/api';
import type { Interview } from '@/types';
import type {
  InterviewStage,
  MediaSettings,
  UseInterviewRoomOptions,
  UseInterviewRoomReturn,
} from './types';

export function useInterviewRoom(
  interview: Interview,
  roomId: string,
  options: UseInterviewRoomOptions = {}
): UseInterviewRoomReturn {
  const { autoConnect = false } = options;
  
  // Refs
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  
  // State
  const [stage, setStage] = useState<InterviewStage>('lobby');
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [mediaSettings, setMediaSettingsState] = useState<MediaSettings>({
    camera: true,
    mic: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch LiveKit token from backend
   */
  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await getInterviewToken(
        interview._id,
        interview.token,
        roomId,
        interview.candidate.name,
        `candidate-${interview.candidate.email}`
      );
      return token;
    } catch (e) {
      console.error('Failed to fetch LiveKit token:', e);
      throw new Error('Failed to connect to interview room. Please try again.');
    }
  }, [interview._id, interview.token, interview.candidate.name, interview.candidate.email, roomId]);

  /**
   * Join the interview room
   */
  const joinInterview = useCallback(async (cameraEnabled: boolean, micEnabled: boolean) => {
    if (!isMountedRef.current) return;
    
    try {
      if (isMountedRef.current) {
        setIsJoining(true);
        setIsLoading(true);
        setError(null);

        // Update media settings
        setMediaSettingsState({
          camera: cameraEnabled,
          mic: micEnabled,
        });
      }

      // Fetch token
      const token = await fetchToken();
      
      if (!isMountedRef.current) return;
      
      if (!token) {
        throw new Error('Failed to get room access token.');
      }

      setLivekitToken(token);
      setStage('meeting');
    } catch (e) {
      const err = e as Error;
      console.error('Failed to join interview:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to join interview. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsJoining(false);
        setIsLoading(false);
      }
    }
  }, [fetchToken, interview._id, interview.token]);

  // Track if endInterview has been called to prevent multiple calls
  const hasEndedRef = useRef(false);

  /**
   * End the interview (complete it)
   */
  const endInterview = useCallback(async () => {
    // Prevent multiple calls
    if (!isMountedRef.current || hasEndedRef.current) return;
    hasEndedRef.current = true;

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
      }
      
      // Notify backend
      await completeInterview(interview._id, interview.token);
      
      if (!isMountedRef.current) return;
      
      setStage('ended');
      setLivekitToken(null);
    } catch (e) {
      console.error('Failed to complete interview:', e);
      // Still mark as ended even if notification fails
      if (isMountedRef.current) {
        setStage('ended');
        setLivekitToken(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [interview._id, interview.token]);

  /**
   * Leave the interview without completing
   */
  const leaveInterview = useCallback(() => {
    if (isMountedRef.current) {
      setStage('ended');
      setLivekitToken(null);
    }
  }, []);

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  /**
   * Update media settings
   */
  const setMediaSettings = useCallback((settings: Partial<MediaSettings>) => {
    if (isMountedRef.current) {
      setMediaSettingsState((prev) => ({
        ...prev,
        ...settings,
      }));
    }
  }, []);

  // Auto-connect if option is enabled
  useEffect(() => {
    if (autoConnect && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      joinInterview(mediaSettings.camera, mediaSettings.mic);
    }
  }, [autoConnect, joinInterview, mediaSettings.camera, mediaSettings.mic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle browser visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && stage === 'meeting') {
        console.log('Tab became hidden during meeting');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stage]);

  // Handle beforeunload warning during meeting
  useEffect(() => {
    if (stage !== 'meeting') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are in an active interview. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stage]);

  return {
    stage,
    livekitToken,
    mediaSettings,
    isLoading,
    isJoining,
    error,
    joinInterview,
    endInterview,
    leaveInterview,
    resetError,
    setMediaSettings,
  };
}
