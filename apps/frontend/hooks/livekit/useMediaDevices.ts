'use client';

/**
 * useMediaDevices Hook
 * 
 * Hook for enumerating and managing available media devices
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaDeviceInfo } from './types';

export interface UseMediaDevicesReturn {
  // Device lists
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshDevices: () => Promise<void>;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const isMountedRef = useRef(true);
  
  // Reset mounted ref on each render cycle start
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Enumerate and categorize available devices
   */
  const refreshDevices = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError('Media devices API not available');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);

      const devices = await navigator.mediaDevices.enumerateDevices();

      if (!isMountedRef.current) return;

      const cameraList: MediaDeviceInfo[] = [];
      const micList: MediaDeviceInfo[] = [];
      const speakerList: MediaDeviceInfo[] = [];

      // Track counts for default labels
      let cameraCount = 0;
      let micCount = 0;
      let speakerCount = 0;
      
      devices.forEach((device) => {
        // Generate default label based on device type
        let defaultLabel = '';
        if (device.kind === 'videoinput') {
          cameraCount++;
          defaultLabel = `Camera ${cameraCount}`;
        } else if (device.kind === 'audioinput') {
          micCount++;
          defaultLabel = `Microphone ${micCount}`;
        } else if (device.kind === 'audiooutput') {
          speakerCount++;
          defaultLabel = `Speaker ${speakerCount}`;
        }
        
        const deviceInfo: MediaDeviceInfo = {
          deviceId: device.deviceId || 'default',
          label: device.label || defaultLabel,
          kind: device.kind as MediaDeviceInfo['kind'],
        };

        switch (device.kind) {
          case 'videoinput':
            cameraList.push(deviceInfo);
            break;
          case 'audioinput':
            micList.push(deviceInfo);
            break;
          case 'audiooutput':
            speakerList.push(deviceInfo);
            break;
        }
      });

      console.log('[useMediaDevices] Found devices:', {
        cameras: cameraList.length,
        microphones: micList.length,
        speakers: speakerList.length,
        raw: devices.map(d => ({ kind: d.kind, label: d.label, deviceId: d.deviceId?.substring(0, 8) }))
      });
      
      setCameras(cameraList);
      setMicrophones(micList);
      setSpeakers(speakerList);
    } catch (e) {
      console.error('Failed to enumerate devices:', e);
      if (isMountedRef.current) {
        setError('Failed to list available devices.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial device enumeration
  useEffect(() => {
    // Only run if mediaDevices is available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      console.log('[useMediaDevices] Initial device enumeration');
      refreshDevices();

      // Listen for device changes
      const handleDeviceChange = () => {
        console.log('[useMediaDevices] Device change detected');
        refreshDevices();
      };

      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    } else {
      console.warn('[useMediaDevices] navigator.mediaDevices not available');
    }
  }, [refreshDevices]);

  return {
    cameras,
    microphones,
    speakers,
    isLoading,
    error,
    refreshDevices,
  };
}
