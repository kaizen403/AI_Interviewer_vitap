/**
 * Hooks Module
 * 
 * Central export for all application hooks
 */

// LiveKit hooks
export {
  useLocalMedia,
  useMediaDevices,
  type PermissionState,
  type VideoResolution,
  type VideoTrackOptions,
  type AudioTrackOptions,
  type UseLocalMediaOptions,
  type UseLocalMediaReturn,
  type MediaDeviceInfo,
  type UseMediaDevicesReturn,
} from './livekit';

// Interview hooks
export {
  useInterviewRoom,
  type InterviewStage,
  type MediaSettings,
  type UseInterviewRoomOptions,
  type UseInterviewRoomReturn,
} from './interview';
