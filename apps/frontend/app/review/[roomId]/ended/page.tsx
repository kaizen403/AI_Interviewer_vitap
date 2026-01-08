'use client';

/**
 * Project Review Ended Page
 * 
 * Shown after a review session is completed
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3040';

interface Summary {
  review: {
    id: string;
    projectTitle: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    student?: {
      name: string;
      regNo?: string;
    };
  };
  report?: {
    overallScore?: number;
    understandingScore?: number;
    clarityScore?: number;
    depthScore?: number;
    strengths?: string[];
    improvements?: string[];
    summary?: string;
  };
}

export default function ReviewEndedPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const student = localStorage.getItem('student');
    if (!student) {
      router.push('/');
      return;
    }

    async function fetchSummary() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/project-review/${roomId}/summary`, {
          headers: {
            'X-Student-Id': JSON.parse(student!).id,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (e) {
        console.error('Failed to fetch summary:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [roomId, router]);

  const isCompleted = summary?.review?.status === 'completed';
  const studentName = summary?.review?.student?.name;
  const projectTitle = summary?.review?.projectTitle;
  const startedAt = summary?.review?.startedAt;
  const completedAt = summary?.review?.completedAt;

  // Calculate duration if both timestamps exist
  let durationMinutes = 0;
  if (startedAt && completedAt) {
    durationMinutes = Math.floor(
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-6">
          {isCompleted ? (
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
          ) : (
            <XCircle className="w-20 h-20 text-gray-500 mx-auto" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">
          {isCompleted
            ? 'Review Complete!'
            : 'Review Ended'
          }
        </h1>

        {/* Message */}
        <p className="text-gray-400 mb-8">
          {isCompleted ? (
            <>
              Thank you for presenting your project, <span className="text-white">{studentName}</span>.
              <br />
              Your review has been recorded and will be evaluated.
            </>
          ) : (
            <>
              This review session has ended.
              <br />
              If you have questions, please contact your administrator.
            </>
          )}
        </p>

        {/* Summary Details */}
        {summary && (
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8 text-left">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Session Summary</h3>
            <div className="space-y-3">
              {studentName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Student</span>
                  <span className="text-white">{studentName}</span>
                </div>
              )}
              {projectTitle && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Project</span>
                  <span className="text-white">{projectTitle}</span>
                </div>
              )}
              {durationMinutes > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">{durationMinutes} min</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${isCompleted ? 'text-green-400' : 'text-gray-400'
                  }`}>
                  {isCompleted ? 'Completed' : 'Ended'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button variant="outline" className="text-white border-gray-600 hover:bg-gray-700">
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Start New Review
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
