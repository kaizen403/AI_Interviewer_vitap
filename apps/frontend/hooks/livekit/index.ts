/**
 * LiveKit Hooks Module
 * 
 * Production-level hooks for LiveKit integration
 */

// Types
export type {
  PermissionState,
  VideoResolution,
  VideoTrackOptions,
  AudioTrackOptions,
  UseLocalMediaOptions,
  UseLocalMediaReturn,
  MediaDeviceInfo,
} from './types';

// Hooks
export { useLocalMedia } from './useLocalMedia';
export { useMediaDevices } from './useMediaDevices';
export type { UseMediaDevicesReturn } from './useMediaDevices';
