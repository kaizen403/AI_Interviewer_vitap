'use client';

/**
 * Protected Image Component
 * Renders an image with protections against easy downloading:
 * - Disables right-click context menu
 * - Prevents drag and drop
 * - Uses CSS to prevent selection
 * - Optionally uses blob URL for additional obscurity
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  useBlob?: boolean;
}

export function ProtectedImage({ 
  src, 
  alt, 
  className,
  useBlob = false,
}: ProtectedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Convert to blob URL for additional protection
  useEffect(() => {
    if (!useBlob) return;

    let url: string | null = null;
    
    const loadAsBlob = async () => {
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (error) {
        console.error('Failed to load image as blob:', error);
        setBlobUrl(null);
      }
    };

    loadAsBlob();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [src, useBlob]);

  // Prevent context menu (right-click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  // Prevent drag
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    return false;
  }, []);

  const imageSrc = useBlob ? (blobUrl || src) : src;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn(
        'select-none pointer-events-auto',
        // CSS to make it harder to save
        '[user-drag:none] [-webkit-user-drag:none]',
        className
      )}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      onLoad={() => setLoaded(true)}
      draggable={false}
      style={{
        // Additional protection via inline styles
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    />
  );
}

// Eva-specific component with hardcoded protected path
export function EvaAvatar({ className }: { className?: string }) {
  return (
    <ProtectedImage
      src="/api/assets/eva"
      alt="Eva"
      className={className}
      useBlob={true}
    />
  );
}

export default ProtectedImage;
