'use client';

/**
 * Audio Level Indicator Component
 * Visual feedback for microphone input level
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AudioLevelIndicatorProps {
  level: number; // 0-100
  isEnabled: boolean;
  variant?: 'bars' | 'wave' | 'dot' | 'mic';
  className?: string;
}

export function AudioLevelIndicator({
  level,
  isEnabled,
  variant = 'bars',
  className,
}: AudioLevelIndicatorProps) {
  // Mic icon variant
  if (variant === 'mic') {
    return (
      <div className={cn('relative flex items-center justify-center', className)}>
        {/* Mic icon */}
        <svg 
          className={cn(
            'w-4 h-4 relative z-10 transition-colors',
            isEnabled && level > 10 ? 'text-green-400' : 'text-white/70'
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
          />
        </svg>
        {/* Animated rings based on audio level */}
        {isEnabled && level > 15 && (
          <span 
            className="absolute inset-0 rounded-full bg-green-500/30 animate-ping"
            style={{ animationDuration: '1s' }}
          />
        )}
        {isEnabled && level > 40 && (
          <span 
            className="absolute -inset-1 rounded-full bg-green-500/20 animate-ping"
            style={{ animationDuration: '0.8s', animationDelay: '0.1s' }}
          />
        )}
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {variant === 'bars' && (
          <>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-4 bg-gray-300 rounded-full"
              />
            ))}
          </>
        )}
        {variant === 'dot' && (
          <div className="w-3 h-3 bg-gray-300 rounded-full" />
        )}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-end gap-0.5 h-5', className)}>
        {[20, 35, 50, 65, 80].map((threshold, i) => (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full transition-all duration-75',
              level >= threshold ? 'bg-green-500' : 'bg-gray-300'
            )}
            style={{
              height: `${(i + 1) * 20}%`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <div className={cn('flex items-center gap-0.5 h-6', className)}>
        {[...Array(7)].map((_, i) => {
          const barLevel = Math.sin((i / 6) * Math.PI) * level;
          return (
            <div
              key={i}
              className="w-0.5 bg-green-500 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(10, barLevel)}%`,
              }}
            />
          );
        })}
      </div>
    );
  }

  // Dot variant
  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'w-3 h-3 rounded-full transition-all duration-75',
          level > 10 ? 'bg-green-500' : 'bg-gray-400'
        )}
      />
      {level > 30 && (
        <div
          className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-50"
        />
      )}
    </div>
  );
}

/**
 * Hook to get audio level from a MediaStreamTrack or LocalAudioTrack
 */
export function useAudioLevel(
  audioTrack: MediaStreamTrack | { mediaStreamTrack: MediaStreamTrack } | null,
  isEnabled: boolean = true
): number {
  const [level, setLevel] = React.useState(0);
  const animationRef = React.useRef<number | undefined>(undefined);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);

  React.useEffect(() => {
    if (!audioTrack || !isEnabled) {
      setLevel(0);
      return;
    }

    const track = 'mediaStreamTrack' in audioTrack 
      ? audioTrack.mediaStreamTrack 
      : audioTrack;

    if (!track || track.readyState !== 'live') {
      setLevel(0);
      return;
    }

    try {
      // Create audio context and analyser
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      // Create source from track
      const stream = new MediaStream([track]);
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Normalize to 0-100
        const normalizedLevel = Math.min(100, (average / 128) * 100);
        setLevel(normalizedLevel);

        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (audioContextRef.current?.state !== 'closed') {
          audioContextRef.current?.close();
        }
      };
    } catch (error) {
      console.error('Failed to create audio analyser:', error);
      setLevel(0);
    }
  }, [audioTrack, isEnabled]);

  return level;
}
