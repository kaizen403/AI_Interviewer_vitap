'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBackendUrl } from '@/lib/api-config';

const BACKEND_URL = getBackendUrl();

type Mode = 'select' | 'start' | 'join';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('select');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Format join code as user types (XXX-XXX)
  const handleJoinCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 6) {
      const formatted = cleaned.length > 3
        ? `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
        : cleaned;
      setJoinCode(formatted);
    }
  };

  // Start new interview (register and go to dashboard)
  const handleStartNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      localStorage.setItem('student', JSON.stringify(data.student));

      if (data.activeReview) {
        router.push(`/review/${data.activeReview.roomId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Join existing room with code
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First get room info
      const infoRes = await fetch(`${BACKEND_URL}/api/project-review/join/${joinCode}`);
      const roomInfo = await infoRes.json();

      if (!infoRes.ok) {
        setError(roomInfo.error || 'Invalid join code');
        return;
      }

      // Join the room
      const joinRes = await fetch(`${BACKEND_URL}/api/project-review/join/${joinCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const joinData = await joinRes.json();

      if (!joinRes.ok) {
        setError(joinData.error || 'Failed to join room');
        return;
      }

      // Store participant info
      localStorage.setItem('participant', JSON.stringify({
        id: joinData.participantId,
        name,
        identity: joinData.identity,
        token: joinData.token,
        roomId: joinData.roomId,
      }));

      // Go to meeting page
      router.push(`/review/${joinData.roomId}/meeting?token=${encodeURIComponent(joinData.token)}`);
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md mx-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Capstone Reviewer
            </h1>
            <p className="text-gray-400">
              AI-powered project presentation review
            </p>
          </div>

          {/* Selection Mode */}
          {mode === 'select' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('start')}
                className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start New Interview
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800/50 text-gray-400">or</span>
                </div>
              </div>

              <button
                onClick={() => setMode('join')}
                className="w-full py-4 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Join Existing Room
              </button>
            </div>
          )}

          {/* Start New Interview Mode */}
          {mode === 'start' && (
            <form onSubmit={handleStartNew} className="space-y-5">
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMode('select'); setError(''); }}
                  className="px-4 py-3 text-gray-400 hover:text-white transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || name.trim().length < 2}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting...' : 'Start Interview'}
                </button>
              </div>
            </form>
          )}

          {/* Join Room Mode */}
          {mode === 'join' && (
            <form onSubmit={handleJoinRoom} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Join Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => handleJoinCodeChange(e.target.value)}
                  placeholder="XXX-XXX"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-center text-2xl font-mono tracking-widest"
                  required
                  autoFocus
                />
              </div>

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
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMode('select'); setError(''); setJoinCode(''); }}
                  className="px-4 py-3 text-gray-400 hover:text-white transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || name.trim().length < 2 || joinCode.length !== 7}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-500">
            By continuing, you agree to participate in the AI-powered review session
          </p>
        </div>
      </div>
    </main>
  );
}
