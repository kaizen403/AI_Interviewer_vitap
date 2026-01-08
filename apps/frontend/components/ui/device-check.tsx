'use client';

/**
 * Device Check Component
 * Troubleshooting tips and device status for camera/mic
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface DeviceCheckProps {
  isCameraWorking: boolean;
  isMicWorking: boolean;
  audioLevel: number;
  onRetryCamera?: () => void;
  onRetryMic?: () => void;
  className?: string;
}

export function DeviceCheck({
  isCameraWorking,
  isMicWorking,
  audioLevel,
  onRetryCamera,
  onRetryMic,
  className,
}: DeviceCheckProps) {
  const [showTroubleshoot, setShowTroubleshoot] = React.useState(false);

  const hasIssues = !isCameraWorking || !isMicWorking || (isMicWorking && audioLevel < 5);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Device Status */}
      <div className="flex items-center gap-4">
        {/* Camera Status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isCameraWorking ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span className="text-sm text-gray-600">
            Camera {isCameraWorking ? 'ready' : 'not detected'}
          </span>
        </div>

        {/* Mic Status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isMicWorking && audioLevel > 5 ? 'bg-green-500' : 
              isMicWorking ? 'bg-yellow-500' : 'bg-red-500'
            )}
          />
          <span className="text-sm text-gray-600">
            {!isMicWorking ? 'Mic not detected' : 
             audioLevel > 5 ? 'Mic ready' : 'Speak to test mic'}
          </span>
        </div>
      </div>

      {/* Troubleshoot link */}
      {hasIssues && (
        <button
          onClick={() => setShowTroubleshoot(!showTroubleshoot)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Having trouble? Click for help
        </button>
      )}

      {/* Troubleshooting Panel */}
      {showTroubleshoot && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <h4 className="font-medium text-gray-900 text-sm">Troubleshooting Tips</h4>
          
          <div className="space-y-2 text-sm text-gray-600">
            {!isCameraWorking && (
              <TroubleshootItem
                title="Camera not working"
                tips={[
                  'Check if another app is using your camera',
                  'Make sure camera permissions are granted in browser settings',
                  'Try refreshing the page',
                  'Check if your camera is connected properly',
                ]}
                onRetry={onRetryCamera}
              />
            )}
            
            {!isMicWorking && (
              <TroubleshootItem
                title="Microphone not working"
                tips={[
                  'Check if microphone permissions are granted',
                  'Make sure no other app is using the microphone',
                  'Check your system audio settings',
                  'Try using a different microphone',
                ]}
                onRetry={onRetryMic}
              />
            )}
            
            {isMicWorking && audioLevel < 5 && (
              <TroubleshootItem
                title="Microphone not picking up audio"
                tips={[
                  'Speak louder or move closer to the microphone',
                  'Check if your microphone is muted in system settings',
                  'Select the correct input device in browser settings',
                  'Try using headphones with a built-in mic',
                ]}
              />
            )}
          </div>

          <button
            onClick={() => setShowTroubleshoot(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

interface TroubleshootItemProps {
  title: string;
  tips: string[];
  onRetry?: () => void;
}

function TroubleshootItem({ title, tips, onRetry }: TroubleshootItemProps) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-gray-800">{title}:</p>
      <ul className="list-disc list-inside space-y-0.5 text-gray-600 ml-2">
        {tips.map((tip, i) => (
          <li key={i}>{tip}</li>
        ))}
      </ul>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 text-blue-600 hover:text-blue-700 text-xs"
        >
          Retry →
        </button>
      )}
    </div>
  );
}
