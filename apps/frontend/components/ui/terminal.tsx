'use client';

/**
 * Terminal Component
 * Animated terminal UI for welcome messages
 * Based on magicui terminal pattern
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TerminalProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Terminal({ children, className, ...props }: TerminalProps) {
  return (
    <div
      className={cn(
        'w-full rounded-xl border border-gray-200 bg-gray-950 font-mono text-sm shadow-lg overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <span className="text-gray-400 text-xs ml-2">pendent-interview</span>
      </div>
      
      {/* Terminal content */}
      <div className="p-4 space-y-2 text-gray-300 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

interface TypingAnimationProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string;
  delay?: number;
  duration?: number;
}

export function TypingAnimation({
  children,
  delay = 0,
  duration = 50,
  className,
  ...props
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = React.useState('');
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  React.useEffect(() => {
    if (!started) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= children.length) {
        setDisplayedText(children.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, duration);

    return () => clearInterval(interval);
  }, [started, children, duration]);

  if (!started) return null;

  return (
    <div className={cn('flex items-center', className)} {...props}>
      <span className="text-green-400 mr-2">❯</span>
      <span>{displayedText}</span>
      {displayedText.length < children.length && (
        <span className="animate-pulse ml-0.5">▋</span>
      )}
    </div>
  );
}

interface AnimatedSpanProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  delay?: number;
}

export function AnimatedSpan({
  children,
  delay = 0,
  className,
  ...props
}: AnimatedSpanProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <span
      className={cn(
        'block pl-6 animate-in fade-in slide-in-from-left-2 duration-300',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface TerminalLineProps {
  prompt?: string;
  children: React.ReactNode;
  className?: string;
}

export function TerminalLine({ 
  prompt = '❯', 
  children, 
  className 
}: TerminalLineProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-green-400">{prompt}</span>
      <span>{children}</span>
    </div>
  );
}
