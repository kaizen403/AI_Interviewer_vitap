/**
 * Environment Configuration
 * 
 * DEV mode: Skip time checks, show join button immediately
 * PROD mode: Enforce time checks, full security
 */

const isDev = process.env.NODE_ENV === 'development';
const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

// Server-side URL takes priority for SSR, falls back to public URL
const getBackendUrl = () => {
  // For server-side (SSR), prefer BACKEND_URL (no NEXT_PUBLIC prefix)
  if (typeof window === 'undefined' && process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  // For client-side or fallback
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
};

export const config = {
  // Environment flags
  isDev,
  isDevMode: isDev || isDevMode, // Dev mode skips time checks
  isProd: process.env.NODE_ENV === 'production',

  // LiveKit configuration
  livekit: {
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880',
  },

  // Backend API
  backend: {
    url: getBackendUrl(),
  },

  // App settings
  app: {
    name: 'Capstone Reviewer',
  },

  // Feature flags
  features: {
    skipTimeCheck: isDev || isDevMode, // Skip 10-minute time check in dev
    skipPermissionCheck: false, // Always require camera/mic permissions
  },
} as const;
