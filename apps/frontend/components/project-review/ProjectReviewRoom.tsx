'use client';

/**
 * Project Review Room Container
 * 
 * Orchestrates the project review flow:
 * 1. Mobile device check
 * 2. Pre-join lobby (camera/mic preview)
 * 3. Active review session (LiveKit room)
 * 4. Redirect to ended page when complete
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import { config } from '@/lib';
import { MobileBlockScreen, useIsMobile } from '@/components/ui';
import { ReviewLobby } from './ReviewLobby';
import { ReviewMeeting } from './ReviewMeeting';
import { getBackendUrl } from '@/lib/api-config';

import '@livekit/components-styles';

const BACKEND_URL = getBackendUrl();

interface Review {
  id: string;
  roomId: string;
  projectTitle: string;
  projectDescription?: string;
  githubUrl?: string;
  pptFileName?: string;
  pptFileUrl?: string;
  joinCode?: string;
  status: string;
  student?: {
    name: string;
    email: string;
    regNo: string;
  };
}

interface ProjectReviewRoomProps {
  roomId: string;
  studentId: string;
  review: Review;
}

type ReviewStage = 'lobby' | 'meeting' | 'ended';

export function ProjectReviewRoom({ roomId, studentId, review }: ProjectReviewRoomProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [stage, setStage] = useState<ReviewStage>('lobby');
  const [isJoining, setIsJoining] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle join meeting
  const handleJoin = useCallback(async () => {
    setIsJoining(true);
    setError(null);

    try {
      // Get LiveKit token
      const res = await fetch(`${BACKEND_URL}/api/project-review/${roomId}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': studentId,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get token');
      }

      console.log('[ProjectReviewRoom] Got LiveKit token');
      setLivekitToken(data.token);

      // Notify backend that student joined
      await fetch(`${BACKEND_URL}/api/project-review/${roomId}/joined`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': studentId,
        },
      });

      console.log('[ProjectReviewRoom] Setting stage to meeting');
      setStage('meeting');
    } catch (err) {
      console.error('[ProjectReviewRoom] Join error:', err);
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setIsJoining(false);
    }
  }, [roomId, studentId]);

  // Handle meeting end
  const handleMeetingEnd = useCallback(async () => {
    console.log('[ProjectReviewRoom] handleMeetingEnd called');

    // Notify backend
    try {
      await fetch(`${BACKEND_URL}/api/project-review/${roomId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': studentId,
        },
      });
    } catch (e) {
      console.error('Failed to complete review:', e);
    }

    setStage('ended');
    router.push(`/review/${roomId}/ended`);
  }, [roomId, studentId, router]);

  // Wait for mobile check
  if (isMobile === null) {
    return <LoadingScreen message="Loading..." />;
  }

  // Block mobile devices
  if (isMobile) {
    return <MobileBlockScreen />;
  }

  // Lobby Stage
  if (stage === 'lobby') {
    return (
      <ReviewLobby
        review={{
          projectTitle: review.projectTitle,
          joinCode: review.joinCode,
          student: review.student,
        }}
        onJoin={handleJoin}
        isJoining={isJoining}
        error={error}
      />
    );
  }

  // Meeting Stage
  if (stage === 'meeting' && livekitToken) {
    return (
      <LiveKitRoom
        serverUrl={config.livekit.url}
        token={livekitToken}
        connect={true}
        audio={true}
        video={true}
        // Connection options for better reliability
        options={{
          // Adaptive streaming for better network handling
          adaptiveStream: true,
          // Disconnect on page hide (mobile)
          disconnectOnPageLeave: true,
          // Enable dynacast for bandwidth optimization
          dynacast: true,
        }}
      >
        <ReviewMeeting
          review={{
            projectTitle: review.projectTitle,
            pptFileName: review.pptFileName,
            pptFileUrl: review.pptFileUrl,
            joinCode: review.joinCode,
            student: review.student,
          }}
          onEnd={handleMeetingEnd}
        />
      </LiveKitRoom>
    );
  }

  // Default loading
  return <LoadingScreen message="Loading..." />;
}

// Simple loading screen
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}
