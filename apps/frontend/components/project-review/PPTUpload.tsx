'use client';

/**
 * PPT Upload Component
 * Drag-and-drop file upload with progress and validation
 */

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface PPTUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  maxSizeMB?: number;
  allowedExtensions?: string[];
}

export function PPTUpload({
  onUpload,
  isUploading,
  uploadProgress,
  maxSizeMB = 10,
  allowedExtensions = ['.ppt', '.pptx', '.pdf'],
}: PPTUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback((file: File): string | null => {
    // Check file extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`;
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }

    return null;
  }, [allowedExtensions, maxSizeBytes, maxSizeMB]);

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
    await onUpload(file);
  }, [validateFile, onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500',
          isUploading && 'pointer-events-none opacity-75'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={allowedExtensions.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {/* Icon */}
        <div className="mb-4">
          <svg
            className={cn(
              'w-16 h-16 mx-auto transition-colors',
              isDragging ? 'text-blue-500' : 'text-gray-400'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* Text */}
        {!selectedFile ? (
          <>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
              {isDragging ? 'Drop your file here' : 'Drag & drop your presentation'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              or <span className="text-blue-500 hover:underline">browse files</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Supported formats: PPT, PPTX, PDF • Max size: {maxSizeMB}MB
            </p>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              {selectedFile.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
