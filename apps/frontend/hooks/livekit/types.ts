/**
 * LiveKit Hook Types
 * 
 * Type definitions for LiveKit related hooks
 */

import type { LocalVideoTrack, LocalAudioTrack, VideoPresets } from 'livekit-client';

// Permission state for media devices
export type PermissionState = 'prompt' | 'granted' | 'denied';

// Video resolution presets
export type VideoResolution = keyof typeof VideoPresets;

// Video track options
export interface VideoTrackOptions {
  resolution?: VideoResolution;
  facingMode?: 'user' | 'environment';
  deviceId?: string;
}

// Audio track options
export interface AudioTrackOptions {
  deviceId?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

// useLocalMedia options
export interface UseLocalMediaOptions {
  video?: boolean;
  audio?: boolean;
  videoOptions?: VideoTrackOptions;
  audioOptions?: AudioTrackOptions;
}

// useLocalMedia return type
export interface UseLocalMediaReturn {
  // Tracks
  videoTrack: LocalVideoTrack | null;
  audioTrack: LocalAudioTrack | null;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Camera state
  isCameraEnabled: boolean;
  cameraPermission: PermissionState;
  
  // Mic state
  isMicEnabled: boolean;
  micPermission: PermissionState;
  
  // Combined state
  hasPermissions: boolean;
  permissionState: PermissionState;
  
  // Actions
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  enableCamera: () => Promise<boolean>;
  disableCamera: () => void;
  enableMic: () => Promise<boolean>;
  disableMic: () => void;
  requestPermissions: () => Promise<boolean>;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  cleanup: () => void;
}

// Device info
export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
}
