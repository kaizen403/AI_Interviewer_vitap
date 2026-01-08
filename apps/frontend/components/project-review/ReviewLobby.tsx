'use client';

/**
 * Review Lobby Component
 * 
 * Pre-join screen with camera/mic preview and device selection
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DeviceDropdown, MicrophoneIcon, VideoCameraIcon } from '@/components/ui';
import { Mic, MicOff, Video, VideoOff, Loader2, Settings } from 'lucide-react';

interface ReviewLobbyProps {
  review: {
    projectTitle: string;
    pptFileName?: string;
    student?: {
      name: string;
      email?: string;
      regNo?: string;
    };
  };
  onJoin: () => void;
  isJoining: boolean;
  error: string | null;
}

export function ReviewLobby({ review, onJoin, isJoining, error }: ReviewLobbyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Initialize media devices
  useEffect(() => {
    async function initMedia() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);

        // Get device list
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const cameras = deviceList.filter(d => d.kind === 'videoinput');
        const microphones = deviceList.filter(d => d.kind === 'audioinput');

        setDevices({ cameras, microphones });

        if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
        if (microphones.length > 0) setSelectedMic(microphones[0].deviceId);
      } catch (err) {
        console.error('Failed to access media devices:', err);
        setPermissionError('Please allow camera and microphone access to continue');
      }
    }

    initMedia();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Update video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = isCameraOn ? stream : null;
    }
  }, [stream, isCameraOn]);

  // Toggle camera
  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOn;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  // Toggle mic
  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
    }
  };

  // Handle device change
  const handleDeviceChange = async (type: 'camera' | 'mic', deviceId: string) => {
    if (type === 'camera') {
      setSelectedCamera(deviceId);
      if (stream) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined },
        });
        stream.getTracks().forEach(track => track.stop());
        setStream(newStream);
      }
    } else {
      setSelectedMic(deviceId);
      if (stream) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
          audio: { deviceId: { exact: deviceId } },
        });
        stream.getTracks().forEach(track => track.stop());
        setStream(newStream);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Ready to present?
          </h1>
          <p className="text-gray-400">
            Check your camera and microphone before joining
          </p>
          <p className="text-xl font-medium text-blue-400 mt-4">
            {review.projectTitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden">
              {isCameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-3xl font-semibold text-white">
                      {review.student?.name?.charAt(0).toUpperCase() || 'S'}
                    </span>
                  </div>
                </div>
              )}

              {/* Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-full transition-colors ${isMicOn
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-red-500 hover:bg-red-600'
                    }`}
                >
                  {isMicOn ? (
                    <Mic className="w-5 h-5 text-white" />
                  ) : (
                    <MicOff className="w-5 h-5 text-white" />
                  )}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-full transition-colors ${isCameraOn
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-red-500 hover:bg-red-600'
                    }`}
                >
                  {isCameraOn ? (
                    <Video className="w-5 h-5 text-white" />
                  ) : (
                    <VideoOff className="w-5 h-5 text-white" />
                  )}
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  <Settings className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Device Settings */}
            {showSettings && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-xl">
                <div className="grid grid-cols-2 gap-4">
                  <DeviceDropdown
                    label="Camera"
                    icon={<VideoCameraIcon className="w-4 h-4" />}
                    devices={devices.cameras.map(d => ({ deviceId: d.deviceId, label: d.label }))}
                    selectedId={selectedCamera}
                    onSelect={(id) => handleDeviceChange('camera', id)}
                  />
                  <DeviceDropdown
                    label="Microphone"
                    icon={<MicrophoneIcon className="w-4 h-4" />}
                    devices={devices.microphones.map(d => ({ deviceId: d.deviceId, label: d.label }))}
                    selectedId={selectedMic}
                    onSelect={(id) => handleDeviceChange('mic', id)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Info & Join */}
          <div className="space-y-6">
            {/* Review Info */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Review Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Student</p>
                  <p className="text-white">{review.student?.name || 'Student'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Project</p>
                  <p className="text-white">{review.projectTitle}</p>
                </div>
                {review.pptFileName && (
                  <div>
                    <p className="text-sm text-gray-400">Presentation</p>
                    <p className="text-white truncate">{review.pptFileName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">Tips</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Ensure good lighting on your face</li>
                <li>• Use headphones to avoid echo</li>
                <li>• Find a quiet environment</li>
                <li>• Have your presentation ready</li>
              </ul>
            </div>

            {/* Join Button */}
            <Button
              onClick={onJoin}
              disabled={isJoining || !!permissionError}
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Review'
              )}
            </Button>

            {/* Errors */}
            {(error || permissionError) && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm text-center">
                  {error || permissionError}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
