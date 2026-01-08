'use client';

/**
 * Countdown Timer Component
 * Shows countdown until interview starts
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  seconds: number;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CountdownTimer({
  seconds: initialSeconds,
  onComplete,
  size = 'md',
  className,
}: CountdownTimerProps) {
  const [seconds, setSeconds] = React.useState(initialSeconds);

  React.useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onComplete]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  return (
    <div className={cn('text-center', className)}>
      <div
        className={cn(
          'font-mono font-bold tabular-nums',
          sizeClasses[size],
          seconds <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-900'
        )}
      >
        {String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
      </div>
    </div>
  );
}

interface WelcomeCountdownProps {
  candidateName: string;
  position: string;
  startInSeconds?: number;
  onReady?: () => void;
  className?: string;
}

export function WelcomeCountdown({
  candidateName,
  position,
  startInSeconds = 60,
  onReady,
  className,
}: WelcomeCountdownProps) {
  const firstName = candidateName.split(' ')[0];

  return (
    <div className={cn('text-center space-y-6', className)}>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome, {firstName}! 👋
        </h2>
        <p className="text-gray-500">
          Your <span className="font-medium text-gray-700">{position}</span> interview will begin in
        </p>
      </div>

      <div className="py-4">
        <CountdownTimer
          seconds={startInSeconds}
          onComplete={onReady}
          size="lg"
        />
      </div>

      <p className="text-sm text-gray-400">
        Make sure your camera and microphone are working
      </p>
    </div>
  );
}
