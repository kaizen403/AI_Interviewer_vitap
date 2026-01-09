'use client';

/**
 * Review Meeting Component
 * 
 * Active review session with LiveKit video/audio
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  AudioTrack,
  VideoTrack,
  TrackRefContext,
  useConnectionState,
  useRoomContext,
} from '@livekit/components-react';
import { Track, RoomEvent, ConnectionState } from 'livekit-client';
import { Button } from '@/components/ui/button';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MonitorOff, Loader2, Users
} from 'lucide-react';

interface ReviewMeetingProps {
  review: {
    projectTitle: string;
    pptFileName?: string;
    pptFileUrl?: string;
    student?: {
      name: string;
      regNo?: string;
    };
  };
  onEnd: () => void;
}

export function ReviewMeeting({ review, onEnd }: ReviewMeetingProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  // Track if we've successfully connected (for proper disconnect handling)
  const hasConnectedRef = useRef(false);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [duration, setDuration] = useState(0);

  // Get all tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle microphone
  const toggleMic = async () => {
    await localParticipant.setMicrophoneEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  };

  // Toggle camera
  const toggleCamera = async () => {
    await localParticipant.setCameraEnabled(!isCameraOn);
    setIsCameraOn(!isCameraOn);
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenSharing);
      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  };

  // End meeting
  const handleEndMeeting = async () => {
    setIsEnding(true);
    try {
      await room.disconnect();
      onEnd();
    } catch {
      onEnd();
    }
  };

  // Track connection state and call onEnd when properly disconnected
  useEffect(() => {
    console.log('[ReviewMeeting] Connection state:', connectionState, 'hasConnected:', hasConnectedRef.current);

    // Track that we've successfully connected
    if (connectionState === ConnectionState.Connected) {
      console.log('[ReviewMeeting] ✅ Successfully connected!');
      hasConnectedRef.current = true;

      // Send PPT file info to the agent via data channel
      if (review.pptFileUrl) {
        console.log('[ReviewMeeting] 📤 Sending PPT file info to agent:', review.pptFileUrl);
        const encoder = new TextEncoder();
        const message = encoder.encode(JSON.stringify({
          type: 'ppt_uploaded',
          data: {
            fileUrl: review.pptFileUrl,
            fileName: review.pptFileName,
          },
        }));
        room.localParticipant.publishData(message, { reliable: true });
      }
    }

    // Only call onEnd if we were previously connected and now disconnected
    if (hasConnectedRef.current && connectionState === ConnectionState.Disconnected) {
      console.log('[ReviewMeeting] Disconnected after being connected, calling onEnd');
      onEnd();
    }
  }, [connectionState, onEnd, review.pptFileUrl, review.pptFileName, room.localParticipant]);

  // Get local and remote video tracks
  const localVideoTrack = tracks.find(
    t => t.participant.isLocal && t.source === Track.Source.Camera
  );
  const localScreenTrack = tracks.find(
    t => t.participant.isLocal && t.source === Track.Source.ScreenShare
  );
  const remoteVideoTracks = tracks.filter(
    t => !t.participant.isLocal && t.source === Track.Source.Camera
  );
  const remoteAudioTracks = tracks.filter(
    t => !t.participant.isLocal && t.source === Track.Source.Microphone
  );

  // Connecting state
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Connecting to review session...</p>
        </div>
      </div>
    );
  }

  // Reconnecting state - show user-friendly message with retry option
  if (connectionState === ConnectionState.Reconnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Reconnecting...</p>
          <p className="text-gray-400 mb-4">Please wait while we restore the connection</p>
        </div>
      </div>
    );
  }

  // Disconnected state (failed to connect)
  if (connectionState === ConnectionState.Disconnected && !hasConnectedRef.current) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-white text-lg mb-2">Connection Failed</p>
          <p className="text-gray-400 mb-4">Unable to connect to the review session</p>
          <p className="text-gray-500 text-sm mb-4">
            This may be due to network restrictions. Try a different network or browser.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="default"
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry Connection
            </Button>
            <Button variant="outline" onClick={onEnd}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="h-14 bg-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">{review.projectTitle}</span>
          <span className="text-gray-400 text-sm">|</span>
          <span className="text-gray-400 text-sm">{formatDuration(duration)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{remoteParticipants.length + 1}</span>
          </div>
        </div>
      </header>

      {/* Main Video Area */}
      <main className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main View (Screen share or remote video) */}
          <div className="lg:col-span-3 bg-gray-800 rounded-xl overflow-hidden relative">
            {/* Screen share takes priority */}
            {localScreenTrack?.publication?.track ? (
              <TrackRefContext.Provider value={localScreenTrack}>
                <VideoTrack
                  trackRef={localScreenTrack}
                  className="w-full h-full object-contain"
                />
              </TrackRefContext.Provider>
            ) : remoteVideoTracks[0]?.publication?.track ? (
              <TrackRefContext.Provider value={remoteVideoTracks[0]}>
                <VideoTrack
                  trackRef={remoteVideoTracks[0]}
                  className="w-full h-full object-cover"
                />
              </TrackRefContext.Provider>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl font-semibold text-white">AI</span>
                  </div>
                  <p className="text-gray-400">AI Reviewer</p>
                </div>
              </div>
            )}

            {/* Local PIP when showing remote or screen */}
            {(remoteVideoTracks.length > 0 || isScreenSharing) && localVideoTrack && (
              <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-xl">
                {isCameraOn && localVideoTrack.publication?.track ? (
                  <TrackRefContext.Provider value={localVideoTrack}>
                    <VideoTrack
                      trackRef={localVideoTrack}
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  </TrackRefContext.Provider>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-700">
                    <span className="text-lg font-semibold text-white">
                      {review.student?.name?.charAt(0).toUpperCase() || 'S'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Panel - Local video when not in PIP */}
          <div className="hidden lg:flex flex-col gap-4">
            {/* Local Video */}
            {!remoteVideoTracks.length && !isScreenSharing && (
              <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden relative">
                {isCameraOn && localVideoTrack?.publication?.track ? (
                  <TrackRefContext.Provider value={localVideoTrack}>
                    <VideoTrack
                      trackRef={localVideoTrack}
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  </TrackRefContext.Provider>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <span className="text-2xl font-semibold text-white">
                      {review.student?.name?.charAt(0).toUpperCase() || 'S'}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                  You
                </div>
              </div>
            )}

            {/* Info Panel */}
            <div className="flex-1 bg-gray-800/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Review Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-500">Student</p>
                  <p className="text-white">{review.student?.name || 'Student'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Project</p>
                  <p className="text-white">{review.projectTitle}</p>
                </div>
                {review.pptFileName && (
                  <div>
                    <p className="text-gray-500">Presentation</p>
                    <p className="text-white truncate">{review.pptFileName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Audio tracks (hidden) */}
      {remoteAudioTracks.map((trackRef) => (
        trackRef.publication?.track && (
          <TrackRefContext.Provider value={trackRef} key={trackRef.publication.trackSid}>
            <AudioTrack trackRef={trackRef} />
          </TrackRefContext.Provider>
        )
      ))}

      {/* Controls */}
      <footer className="h-20 bg-gray-800 flex items-center justify-center gap-4">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full transition-colors ${isMicOn
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-red-500 hover:bg-red-600'
            }`}
          title={isMicOn ? 'Mute' : 'Unmute'}
        >
          {isMicOn ? (
            <Mic className="w-5 h-5 text-white" />
          ) : (
            <MicOff className="w-5 h-5 text-white" />
          )}
        </button>

        <button
          onClick={toggleCamera}
          className={`p-4 rounded-full transition-colors ${isCameraOn
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-red-500 hover:bg-red-600'
            }`}
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn ? (
            <Video className="w-5 h-5 text-white" />
          ) : (
            <VideoOff className="w-5 h-5 text-white" />
          )}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-4 rounded-full transition-colors ${isScreenSharing
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-700 hover:bg-gray-600'
            }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-5 h-5 text-white" />
          ) : (
            <Monitor className="w-5 h-5 text-white" />
          )}
        </button>

        <button
          onClick={handleEndMeeting}
          disabled={isEnding}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
          title="End review"
        >
          {isEnding ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <PhoneOff className="w-5 h-5 text-white" />
          )}
        </button>
      </footer>
    </div>
  );
}
