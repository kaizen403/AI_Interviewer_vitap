/**
 * API Configuration
 * Centralized backend URL configuration
 */

// In production, use same origin (frontend and backend on same Render service)
export function getBackendUrl(): string {
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        return process.env.NEXT_PUBLIC_BACKEND_URL;
    }

    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return window.location.origin;
    }

    return 'http://localhost:3040';
}

export const BACKEND_URL = getBackendUrl();
