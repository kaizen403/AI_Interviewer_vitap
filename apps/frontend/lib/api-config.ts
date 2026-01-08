/**
 * API Configuration
 * 
 * In production, API calls go through Next.js rewrites (same origin).
 * In development, calls go directly to the backend.
 */

export function getBackendUrl(): string {
    // If explicit backend URL is set, use it
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        return process.env.NEXT_PUBLIC_BACKEND_URL;
    }

    // In browser (production), use same origin - Next.js rewrites handle the proxy
    if (typeof window !== 'undefined') {
        // In production, use same origin (Next.js rewrites proxy to backend)
        if (window.location.hostname !== 'localhost') {
            return '';  // Empty string = same origin
        }
    }

    // Local development - direct to backend
    return 'http://localhost:3040';
}
