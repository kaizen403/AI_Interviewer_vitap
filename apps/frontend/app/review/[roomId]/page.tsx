'use client';

/**
 * Project Review Room Page
 * 
 * Client component that loads review and renders the room
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProjectReviewRoom } from '@/components/project-review';
import { getBackendUrl } from '@/lib/api-config';

const BACKEND_URL = getBackendUrl();

interface Student {
  id: string;
  name: string;
  email: string;
  regNo: string;
}

interface Review {
  id: string;
  roomId: string;
  projectTitle: string;
  projectDescription?: string;
  githubUrl?: string;
  pptFileName?: string;
  pptFileUrl?: string;
  pptUploaded: boolean;
  pptContent?: string;
  joinCode?: string;
  status: string;
  student?: {
    name: string;
    email: string;
    regNo: string;
  };
}

export default function ReviewRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedStudent = localStorage.getItem('student');
    if (!storedStudent) {
      router.push('/');
      return;
    }

    const parsedStudent = JSON.parse(storedStudent);
    setStudent(parsedStudent);

    // Fetch review details
    async function fetchReview() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/project-review/${roomId}`, {
          headers: {
            'X-Student-Id': parsedStudent.id,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load review');
          return;
        }

        // Check if PPT is uploaded
        if (!data.pptUploaded) {
          router.push(`/review/${roomId}/upload`);
          return;
        }

        // Check if review is completed
        if (data.status === 'completed') {
          router.push(`/review/${roomId}/ended`);
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
  }, [roomId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <div className="animate-spin h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400">Loading review session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4 max-w-md mx-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Error</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!review || !student) {
    return null;
  }

  return (
    <ProjectReviewRoom
      roomId={roomId}
      studentId={student.id}
      review={review}
    />
  );
}
