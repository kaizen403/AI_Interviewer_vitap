'use client';

/**
 * Loading Spinner Component
 */

import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 border-2',
  md: 'w-12 h-12 border-4',
  lg: 'w-16 h-16 border-4',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        sizeClasses[size],
        'border-border border-t-text-primary rounded-full animate-spin',
        className
      )}
    />
  );
}
