/**
 * API Service
 * Helper functions for API calls
 */

import { config } from './config';

const BASE_URL = config.backend.url;

/**
 * Generic fetch wrapper with error handling
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get project review token
 */
export async function getReviewToken(
  roomId: string,
  studentId: string
): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/project-review/${roomId}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Student-Id': studentId,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Failed to get room token');
  }

  const data = await response.json();
  return data.token;
}
