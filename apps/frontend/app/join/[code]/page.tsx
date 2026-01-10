'use client';

/**
 * Join Room by Code Page
 * 
 * Shareable link that redirects users to join a room via code
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getBackendUrl } from '@/lib/api-config';
import { Loader2 } from 'lucide-react';

const BACKEND_URL = getBackendUrl();

export default function JoinByCodePage() {
    const router = useRouter();
    const params = useParams();
    const code = params.code as string;

    const [status, setStatus] = useState<'loading' | 'name-entry' | 'error'>('loading');
    const [roomInfo, setRoomInfo] = useState<any>(null);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    // Check if code is valid
    useEffect(() => {
        async function checkCode() {
            try {
                const res = await fetch(`${BACKEND_URL}/api/project-review/join/${code}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'Invalid join code');
                    setStatus('error');
                    return;
                }

                setRoomInfo(data);
                setStatus('name-entry');
            } catch (err) {
                setError('Failed to connect to server');
                setStatus('error');
            }
        }

        if (code) {
            checkCode();
        }
    }, [code]);

    // Handle join
    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsJoining(true);
        setError('');

        try {
            const res = await fetch(`${BACKEND_URL}/api/project-review/join/${code}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to join room');
                return;
            }

            // Store participant info
            localStorage.setItem('participant', JSON.stringify({
                id: data.participantId,
                name,
                identity: data.identity,
                token: data.token,
                roomId: data.roomId,
            }));

            // Go to meeting page with token
            router.push(`/review/${data.roomId}/meeting?token=${encodeURIComponent(data.token)}`);
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setIsJoining(false);
        }
    };

    // Loading state
    if (status === 'loading') {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Verifying room code...</p>
                </div>
            </main>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="w-full max-w-md mx-4">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Invalid Room Code</h2>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                        >
                            Go to Home
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // Name entry
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="w-full max-w-md mx-4">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white mb-2">Join Review Session</h1>
                        <p className="text-gray-400">{roomInfo?.projectTitle}</p>
                        <div className="mt-4 inline-block bg-gray-700/50 px-4 py-2 rounded-lg">
                            <span className="text-gray-400 text-sm">Room Code: </span>
                            <code className="text-green-400 font-mono font-bold text-lg">{code}</code>
                        </div>
                    </div>

                    {/* Participants info */}
                    {roomInfo && (
                        <div className="mb-6 p-3 bg-gray-700/30 rounded-lg text-center">
                            <span className="text-gray-400 text-sm">
                                {roomInfo.currentParticipants}/{roomInfo.maxParticipants} participants
                            </span>
                        </div>
                    )}

                    {/* Name form */}
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                required
                                minLength={2}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isJoining || name.trim().length < 2}
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isJoining ? 'Joining...' : 'Join Session'}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
