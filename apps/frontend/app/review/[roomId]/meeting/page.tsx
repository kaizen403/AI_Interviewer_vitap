'use client';

/**
 * Direct Meeting Join Page
 * 
 * For participants who join via code - skips lobby, goes straight to meeting
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import { config } from '@/lib';
import { ReviewMeeting } from '@/components/project-review/ReviewMeeting';
import { MobileBlockScreen, useIsMobile } from '@/components/ui';
import { getBackendUrl } from '@/lib/api-config';
import { Loader2 } from 'lucide-react';

import '@livekit/components-styles';

const BACKEND_URL = getBackendUrl();

interface Review {
    id: string;
    roomId: string;
    projectTitle: string;
    pptFileName?: string;
    pptFileUrl?: string;
    joinCode?: string;
    student?: {
        name: string;
    };
}

export default function MeetingPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const roomId = params.roomId as string;
    const token = searchParams.get('token');

    const isMobile = useIsMobile();

    const [review, setReview] = useState<Review | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch review details
    useEffect(() => {
        if (!token) {
            router.push('/');
            return;
        }

        async function fetchReview() {
            try {
                const res = await fetch(`${BACKEND_URL}/api/project-review/${roomId}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'Failed to load review');
                    return;
                }

                setReview(data);
            } catch (err) {
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        }

        fetchReview();
    }, [roomId, token, router]);

    // Handle meeting end
    const handleMeetingEnd = () => {
        router.push(`/review/${roomId}/ended`);
    };

    // Mobile check
    if (isMobile === null || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Joining meeting...</p>
                </div>
            </div>
        );
    }

    if (isMobile) {
        return <MobileBlockScreen />;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center max-w-md mx-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    if (!review || !token) {
        return null;
    }

    return (
        <LiveKitRoom
            serverUrl={config.livekit.url}
            token={token}
            connect={true}
            audio={true}
            video={true}
            options={{
                adaptiveStream: true,
                disconnectOnPageLeave: true,
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
