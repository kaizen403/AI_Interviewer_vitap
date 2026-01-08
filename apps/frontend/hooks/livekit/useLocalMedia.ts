'use client';

/**
 * useLocalMedia Hook
 * 
 * Production-level hook for managing local camera and microphone tracks
 * using LiveKit client SDK with proper:
 * - Track creation and cleanup
 * - Permission handling
 * - Error recovery
 * - State management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  createLocalVideoTrack,
  createLocalAudioTrack,
  LocalVideoTrack,
  LocalAudioTrack,
  VideoPresets,
  TrackEvent,
} from 'livekit-client';
import type {
  PermissionState,
  UseLocalMediaOptions,
  UseLocalMediaReturn,
} from './types';

export function useLocalMedia(options: UseLocalMediaOptions = {}): UseLocalMediaReturn {
  const { 
    video = true, 
    audio = true,
    videoOptions = {},
    audioOptions = {},
  } = options;

  // Track refs for cleanup
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const isMountedRef = useRef(true);
  const isInitializingRef = useRef(false);

  // State
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('prompt');
  const [micPermission, setMicPermission] = useState<PermissionState>('prompt');

  /**
   * Check browser permission status
   */
  const checkPermissions = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const [cameraResult, micResult] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null),
          navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null),
        ]);

        if (cameraResult && isMountedRef.current) {
          setCameraPermission(cameraResult.state as PermissionState);
          cameraResult.onchange = () => {
            if (isMountedRef.current) {
              setCameraPermission(cameraResult.state as PermissionState);
            }
          };
        }

        if (micResult && isMountedRef.current) {
          setMicPermission(micResult.state as PermissionState);
          micResult.onchange = () => {
            if (isMountedRef.current) {
              setMicPermission(micResult.state as PermissionState);
            }
          };
        }
      }
    } catch {
      // Permissions API not available
    }
  }, []);

  /**
   * Stop and cleanup a video track
   */
  const stopVideoTrack = useCallback(() => {
    if (videoTrackRef.current) {
      try {
        videoTrackRef.current.stop();
      } catch {
        // Track may already be stopped
      }
      videoTrackRef.current = null;
    }
    if (isMountedRef.current) {
      setVideoTrack(null);
      setIsCameraEnabled(false);
    }
  }, []);

  /**
   * Stop and cleanup an audio track
   */
  const stopAudioTrack = useCallback(() => {
    if (audioTrackRef.current) {
      try {
        audioTrackRef.current.stop();
      } catch {
        // Track may already be stopped
      }
      audioTrackRef.current = null;
    }
    if (isMountedRef.current) {
      setAudioTrack(null);
      setIsMicEnabled(false);
    }
  }, []);

  /**
   * Create and enable video track
   */
  const enableCamera = useCallback(async (): Promise<boolean> => {
    console.log('[useLocalMedia] enableCamera called, mounted:', isMountedRef.current);
    if (!isMountedRef.current) return false;
    
    // If already have a track, just unmute it
    if (videoTrackRef.current) {
      try {
        console.log('[useLocalMedia] Unmuting existing camera track');
        await videoTrackRef.current.unmute();
        if (isMountedRef.current) {
          setIsCameraEnabled(true);
        }
        return true;
      } catch (e) {
        console.error('[useLocalMedia] Failed to unmute camera:', e);
        stopVideoTrack();
      }
    }

    try {
      console.log('[useLocalMedia] Creating new camera track...');
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      const resolution = videoOptions.resolution 
        ? VideoPresets[videoOptions.resolution] 
        : VideoPresets.h720;

      const track = await createLocalVideoTrack({
        resolution,
        facingMode: videoOptions.facingMode || 'user',
        deviceId: videoOptions.deviceId,
      });

      console.log('[useLocalMedia] Camera track created successfully');
      
      if (!isMountedRef.current) {
        console.log('[useLocalMedia] Component unmounted, stopping track');
        track.stop();
        return false;
      }

      // Track ended listener for cleanup
      track.on(TrackEvent.Ended, () => {
        console.log('[useLocalMedia] Camera track ended');
        if (isMountedRef.current && videoTrackRef.current === track) {
          stopVideoTrack();
        }
      });

      videoTrackRef.current = track;
      setVideoTrack(track);
      setIsCameraEnabled(true);
      setCameraPermission('granted');
      console.log('[useLocalMedia] Camera enabled successfully');
      
      return true;
    } catch (e) {
      const err = e as Error;
      console.error('Failed to enable camera:', err);
      
      if (isMountedRef.current) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraPermission('denied');
          setError('Camera permission denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is in use by another application. Please close it and try again.');
        } else {
          setError('Failed to access camera. Please check your device settings.');
        }
      }
      
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [videoOptions, stopVideoTrack]);

  /**
   * Disable/mute video track
   */
  const disableCamera = useCallback(() => {
    if (videoTrackRef.current) {
      try {
        videoTrackRef.current.mute();
      } catch {
        // Track may already be muted
      }
    }
    if (isMountedRef.current) {
      setIsCameraEnabled(false);
    }
  }, []);

  /**
   * Create and enable audio track
   */
  const enableMic = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return false;

    // If already have a track, just unmute it
    if (audioTrackRef.current) {
      try {
        await audioTrackRef.current.unmute();
        if (isMountedRef.current) {
          setIsMicEnabled(true);
        }
        return true;
      } catch (e) {
        console.error('Failed to unmute microphone:', e);
        stopAudioTrack();
      }
    }

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      const track = await createLocalAudioTrack({
        deviceId: audioOptions.deviceId,
        echoCancellation: audioOptions.echoCancellation ?? true,
        noiseSuppression: audioOptions.noiseSuppression ?? true,
        autoGainControl: audioOptions.autoGainControl ?? true,
      });

      if (!isMountedRef.current) {
        track.stop();
        return false;
      }

      // Track ended listener for cleanup
      track.on(TrackEvent.Ended, () => {
        if (isMountedRef.current && audioTrackRef.current === track) {
          stopAudioTrack();
        }
      });

      audioTrackRef.current = track;
      setAudioTrack(track);
      setIsMicEnabled(true);
      setMicPermission('granted');
      
      return true;
    } catch (e) {
      const err = e as Error;
      console.error('Failed to enable microphone:', err);
      
      if (isMountedRef.current) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicPermission('denied');
          setError('Microphone permission denied. Please allow microphone access and try again.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Microphone is in use by another application. Please close it and try again.');
        } else {
          setError('Failed to access microphone. Please check your device settings.');
        }
      }
      
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [audioOptions, stopAudioTrack]);

  /**
   * Disable/mute audio track
   */
  const disableMic = useCallback(() => {
    if (audioTrackRef.current) {
      try {
        audioTrackRef.current.mute();
      } catch {
        // Track may already be muted
      }
    }
    if (isMountedRef.current) {
      setIsMicEnabled(false);
    }
  }, []);

  /**
   * Toggle camera on/off
   */
  const toggleCamera = useCallback(async () => {
    if (isCameraEnabled) {
      disableCamera();
    } else {
      await enableCamera();
    }
  }, [isCameraEnabled, enableCamera, disableCamera]);

  /**
   * Toggle microphone on/off
   */
  const toggleMic = useCallback(async () => {
    if (isMicEnabled) {
      disableMic();
    } else {
      await enableMic();
    }
  }, [isMicEnabled, enableMic, disableMic]);

  /**
   * Request permissions for both camera and microphone
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    let success = true;

    if (video) {
      const cameraSuccess = await enableCamera();
      if (!cameraSuccess) success = false;
    }

    if (audio) {
      const micSuccess = await enableMic();
      if (!micSuccess) success = false;
    }

    if (isMountedRef.current) {
      setIsLoading(false);
    }
    return success;
  }, [video, audio, enableCamera, enableMic]);

  /**
   * Switch to a different camera
   */
  const switchCamera = useCallback(async (deviceId: string) => {
    if (!isMountedRef.current) return;

    const wasEnabled = isCameraEnabled;
    stopVideoTrack();

    if (wasEnabled) {
      try {
        if (isMountedRef.current) {
          setIsLoading(true);
        }

        const resolution = videoOptions.resolution 
          ? VideoPresets[videoOptions.resolution] 
          : VideoPresets.h720;

        const track = await createLocalVideoTrack({
          resolution,
          deviceId,
        });

        if (!isMountedRef.current) {
          track.stop();
          return;
        }

        track.on(TrackEvent.Ended, () => {
          if (isMountedRef.current && videoTrackRef.current === track) {
            stopVideoTrack();
          }
        });

        videoTrackRef.current = track;
        setVideoTrack(track);
        setIsCameraEnabled(true);
      } catch (e) {
        console.error('Failed to switch camera:', e);
        if (isMountedRef.current) {
          setError('Failed to switch camera. Please try again.');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }
  }, [isCameraEnabled, videoOptions, stopVideoTrack]);

  /**
   * Switch to a different microphone
   */
  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (!isMountedRef.current) return;

    const wasEnabled = isMicEnabled;
    stopAudioTrack();

    if (wasEnabled) {
      try {
        if (isMountedRef.current) {
          setIsLoading(true);
        }

        const track = await createLocalAudioTrack({
          deviceId,
          echoCancellation: audioOptions.echoCancellation ?? true,
          noiseSuppression: audioOptions.noiseSuppression ?? true,
          autoGainControl: audioOptions.autoGainControl ?? true,
        });

        if (!isMountedRef.current) {
          track.stop();
          return;
        }

        track.on(TrackEvent.Ended, () => {
          if (isMountedRef.current && audioTrackRef.current === track) {
            stopAudioTrack();
          }
        });

        audioTrackRef.current = track;
        setAudioTrack(track);
        setIsMicEnabled(true);
      } catch (e) {
        console.error('Failed to switch microphone:', e);
        if (isMountedRef.current) {
          setError('Failed to switch microphone. Please try again.');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }
  }, [isMicEnabled, audioOptions, stopAudioTrack]);

  /**
   * Cleanup all tracks
   */
  const cleanup = useCallback(() => {
    stopVideoTrack();
    stopAudioTrack();
  }, [stopVideoTrack, stopAudioTrack]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Initialize tracks on mount if requested
  useEffect(() => {
    console.log('[useLocalMedia] Mount effect running');
    // Reset initialization flag on mount (handles React Strict Mode double-mount)
    isInitializingRef.current = false;
    isMountedRef.current = true;

    const initialize = async () => {
      if (isInitializingRef.current) {
        console.log('[useLocalMedia] Already initializing, skipping');
        return;
      }
      isInitializingRef.current = true;
      console.log('[useLocalMedia] Starting initialization, video:', video, 'audio:', audio);
      
      if (video || audio) {
        const result = await requestPermissions();
        console.log('[useLocalMedia] requestPermissions result:', result);
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(initialize, 100);

    // Cleanup on unmount
    return () => {
      console.log('[useLocalMedia] Unmount cleanup');
      clearTimeout(timer);
      isMountedRef.current = false;
      isInitializingRef.current = false;
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed state
  const hasPermissions = cameraPermission === 'granted' && micPermission === 'granted';
  const permissionState: PermissionState = 
    cameraPermission === 'denied' || micPermission === 'denied' 
      ? 'denied' 
      : hasPermissions 
        ? 'granted' 
        : 'prompt';

  return {
    // Tracks
    videoTrack,
    audioTrack,
    
    // State
    isLoading,
    error,
    
    // Camera state
    isCameraEnabled,
    cameraPermission,
    
    // Mic state
    isMicEnabled,
    micPermission,
    
    // Combined state
    hasPermissions,
    permissionState,
    
    // Actions
    toggleCamera,
    toggleMic,
    enableCamera,
    disableCamera,
    enableMic,
    disableMic,
    requestPermissions,
    switchCamera,
    switchMicrophone,
    cleanup,
  };
}
