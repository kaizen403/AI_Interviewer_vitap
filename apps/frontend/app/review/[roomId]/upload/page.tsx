'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3040';

interface Student {
    id: string;
    name: string;
    email: string;
    regNo: string;
}

interface Review {
    id: string;
    roomId: string;
    status: string;
    projectTitle: string;
}

export default function UploadPage() {
    const router = useRouter();
    const params = useParams();
    const roomId = params.roomId as string;

    const [student, setStudent] = useState<Student | null>(null);
    const [review, setReview] = useState<Review | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        const storedStudent = localStorage.getItem('student');
        const storedReview = localStorage.getItem('currentReview');

        if (!storedStudent) {
            router.push('/');
            return;
        }

        setStudent(JSON.parse(storedStudent));
        if (storedReview) {
            setReview(JSON.parse(storedReview));
        }
    }, [router]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (isValidFile(droppedFile)) {
                setFile(droppedFile);
                setError('');
            } else {
                setError('Please upload a PowerPoint file (.pptx, .ppt) or PDF');
            }
        }
    }, []);

    const isValidFile = (file: File) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/pdf',
        ];
        return validTypes.includes(file.type) || file.name.endsWith('.pptx') || file.name.endsWith('.ppt') || file.name.endsWith('.pdf');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (isValidFile(selectedFile)) {
                setFile(selectedFile);
                setError('');
            } else {
                setError('Please upload a PowerPoint file (.pptx, .ppt) or PDF');
            }
        }
    };

    const handleUpload = async () => {
        if (!file || !student) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('ppt', file);

            const res = await fetch(`${BACKEND_URL}/api/project-review/${roomId}/upload`, {
                method: 'POST',
                headers: {
                    'X-Student-Id': student.id,
                },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Upload failed');
                return;
            }

            // Update review status in localStorage
            if (review) {
                localStorage.setItem('currentReview', JSON.stringify({ ...review, status: 'ready' }));
            }

            // Redirect to review room
            router.push(`/review/${roomId}`);
        } catch (err) {
            setError('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!student) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white">Capstone Reviewer</h1>
                    <div className="text-right">
                        <p className="text-sm font-medium text-white">{student.name}</p>
                        <p className="text-xs text-gray-400">{review?.projectTitle}</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Upload Your Presentation
                        </h2>
                        <p className="text-gray-400">
                            Upload your project PPT so the AI can review your work
                        </p>
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
                                ? 'border-blue-500 bg-blue-500/10'
                                : file
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-gray-600 hover:border-gray-500'
                            }`}
                    >
                        {file ? (
                            <div className="space-y-3">
                                <div className="w-12 h-12 mx-auto rounded-lg bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-white font-medium">{file.name}</p>
                                <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                                <button
                                    onClick={() => setFile(null)}
                                    className="text-sm text-red-400 hover:text-red-300 transition"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="w-12 h-12 mx-auto rounded-lg bg-gray-700 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <p className="text-gray-300">
                                    Drag and drop your PPT here, or{' '}
                                    <label className="text-blue-400 hover:text-blue-300 cursor-pointer">
                                        browse
                                        <input
                                            type="file"
                                            accept=".pptx,.ppt,.pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                </p>
                                <p className="text-sm text-gray-500">
                                    Supports .pptx, .ppt, and .pdf (max 50MB)
                                </p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Uploading...
                            </span>
                        ) : (
                            'Upload & Start Review'
                        )}
                    </button>
                </div>
            </div>
        </main>
    );
}
