'use client';

/**
 * Device Dropdown Component
 * Custom dropdown for selecting media devices
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, CheckIcon } from './icons';

export interface DeviceOption {
  deviceId: string;
  label: string;
}

export interface DeviceDropdownProps {
  label: string;
  icon: ReactNode;
  devices: DeviceOption[];
  selectedId: string;
  onSelect: (deviceId: string) => void;
  placeholder?: string;
}

export function DeviceDropdown({
  label,
  icon,
  devices,
  selectedId,
  onSelect,
  placeholder = 'Select device...'
}: DeviceDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDevice = devices.find(d => d.deviceId === selectedId);
  const displayLabel = selectedDevice?.label || placeholder;
  const hasDevices = devices.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => hasDevices && setOpen(!open)}
        disabled={!hasDevices}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border bg-background text-sm transition-all w-[160px] overflow-hidden',
          !hasDevices && 'opacity-60 cursor-not-allowed',
          open
            ? 'border-primary ring-2 ring-primary-light'
            : 'border-border-muted hover:border-text-subtle'
        )}
      >
        <span className="text-text-subtle flex-shrink-0">{icon}</span>
        <span className="truncate flex-1 text-left text-text-primary min-w-0">{displayLabel}</span>
        {hasDevices && (
          <ChevronDownIcon className={cn(
            'w-4 h-4 text-text-subtle transition-transform flex-shrink-0',
            open && 'rotate-180'
          )} />
        )}
      </button>

      {/* Dropdown label */}
      <span className="absolute -top-2 left-3 bg-background px-1 text-xs text-text-subtle">{label}</span>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background rounded-lg border border-border-muted shadow-lg z-50 py-1 max-h-48 overflow-auto">
          {devices.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-subtle">No devices found</div>
          ) : (
            devices.map((device, index) => (
              <button
                key={`${device.deviceId}-${index}`}
                onClick={() => {
                  onSelect(device.deviceId);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-background-muted transition-colors',
                  device.deviceId === selectedId && 'bg-primary-light'
                )}
              >
                <span className={cn(
                  'truncate pr-2',
                  device.deviceId === selectedId ? 'text-primary font-medium' : 'text-text-primary'
                )}>
                  {device.label || 'Unknown Device'}
                </span>
                {device.deviceId === selectedId && (
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
