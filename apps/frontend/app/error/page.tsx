/**
 * Error Page
 * 
 * Route: /error?type=xxx&message=xxx
 * 
 * Error types:
 * - invalid: Invalid or expired link
 * - cancelled: Interview was cancelled
 * - expired: Interview link has expired
 * - network: Network/connection error
 * - server: Server error
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ERROR_CONFIG: Record<string, { 
  icon: 'warning' | 'cancelled' | 'expired' | 'error';
  title: string; 
  description: string;
  showRetry?: boolean;
}> = {
  invalid: {
    icon: 'warning',
    title: 'Invalid Link',
    description: 'This interview link is invalid or has expired. Please check your email for the correct link.',
  },
  cancelled: {
    icon: 'cancelled',
    title: 'Interview Cancelled',
    description: 'This interview has been cancelled by the organizer. If you believe this is an error, please contact support.',
  },
  expired: {
    icon: 'expired',
    title: 'Link Expired',
    description: 'This interview link has expired. Please request a new interview link from the hiring team.',
  },
  network: {
    icon: 'error',
    title: 'Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection and try again.',
    showRetry: true,
  },
  server: {
    icon: 'error',
    title: 'Something Went Wrong',
    description: 'We encountered an unexpected error. Please try again later or contact support if the problem persists.',
    showRetry: true,
  },
};

function ErrorIcon({ type }: { type: string }) {
  const iconType = ERROR_CONFIG[type]?.icon || 'error';
  
  const iconClasses = {
    warning: 'bg-yellow-100 text-yellow-600',
    cancelled: 'bg-red-100 text-red-600',
    expired: 'bg-orange-100 text-orange-600',
    error: 'bg-gray-100 text-gray-600',
  };
  
  const icons = {
    warning: (
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
      />
    ),
    cancelled: (
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M6 18L18 6M6 6l12 12" 
      />
    ),
    expired: (
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    ),
    error: (
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    ),
  };

  return (
    <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${iconClasses[iconType]}`}>
      <svg 
        className="w-10 h-10" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {icons[iconType]}
      </svg>
    </div>
  );
}

function ErrorContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'invalid';
  const message = searchParams.get('message');
  
  const config = ERROR_CONFIG[type] || ERROR_CONFIG.invalid;
  const displayMessage = message || config.description;

  return (
    <div className="text-center max-w-md">
      <ErrorIcon type={type} />

      <h1 className="text-2xl font-semibold text-gray-900 mb-3">
        {config.title}
      </h1>
      
      <p className="text-gray-600 mb-8">
        {displayMessage}
      </p>

      <div className="space-y-3">
        {config.showRetry && (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            Try Again
          </button>
        )}
        
        <a
          href="mailto:support@pendent.ai"
          className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
