'use client';

/**
 * Avatar Component
 * shadcn-style avatar with fallback
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-24 h-24 text-2xl',
};

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const initials = React.useMemo(() => {
    if (fallback) return fallback;
    if (!alt) return '?';
    return alt
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [alt, fallback]);

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-gray-100',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt || ''}
          className="aspect-square h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 font-medium text-gray-600">
          {initials}
        </div>
      )}
    </div>
  );
}

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  children: React.ReactNode;
}

export function AvatarGroup({
  max = 4,
  children,
  className,
  ...props
}: AvatarGroupProps) {
  const avatars = React.Children.toArray(children);
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)} {...props}>
      {visible.map((avatar, i) => (
        <div
          key={i}
          className="ring-2 ring-white rounded-full"
        >
          {avatar}
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 ring-2 ring-white">
          +{remaining}
        </div>
      )}
    </div>
  );
}
