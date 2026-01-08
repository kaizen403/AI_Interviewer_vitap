/**
 * Project Review API Service
 */

import { config } from './config';
import type { ProjectReview, UploadedFile, ProjectReviewSummary } from '@/types';

const BASE_URL = config.backend.url;

export interface ProjectReviewValidationResponse {
  success: boolean;
  review?: ProjectReview;
  error?: string;
  status?: string;
  edge_case?: string;
}

/**
 * Validate project review by roomId and token
 */
export async function validateProjectReview(
  roomId: string, 
  token: string
): Promise<ProjectReviewValidationResponse> {
  try {
    const response = await fetch(`${BASE_URL}/api/project-review/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, token }),
      cache: 'no-store',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Invalid project review link',
        status: data.status,
        edge_case: data.edge_case,
      };
    }

    return {
      success: true,
      review: data as ProjectReview,
      edge_case: data.edge_case,
    };
  } catch (error) {
    console.error('Failed to validate project review:', error);
    return {
      success: false,
      error: 'Unable to connect to server',
    };
  }
}

/**
 * Upload PPT file
 */
export async function uploadPPT(
  reviewId: string,
  reviewToken: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; file?: UploadedFile; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('ppt', file);

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        console.log('[uploadPPT] Response status:', xhr.status, 'response:', xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve({ success: true, file: data.file });
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ success: false, error: data.error || 'Upload failed' });
          } catch {
            resolve({ success: false, error: 'Upload failed' });
          }
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Network error during upload' });
      });

      xhr.open('POST', `${BASE_URL}/api/project-review/${reviewId}/upload`);
      xhr.setRequestHeader('x-review-token', reviewToken);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Failed to upload PPT:', error);
    return { success: false, error: 'Failed to upload file' };
  }
}

/**
 * Get LiveKit token for project review
 */
export async function getProjectReviewToken(
  reviewId: string,
  reviewToken: string,
  roomId: string,
  participantName: string,
  participantIdentity: string
): Promise<string> {
  console.log('[getProjectReviewToken] Fetching token for:', { reviewId, roomId, participantName });
  const response = await fetch(`${BASE_URL}/api/project-review/${reviewId}/token`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-review-token': reviewToken,
    },
    body: JSON.stringify({
      roomId,
      participantName,
      participantIdentity,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    console.error('[getProjectReviewToken] Error:', data);
    throw new Error(data.error || 'Failed to get room token');
  }

  const data = await response.json();
  console.log('[getProjectReviewToken] Got token, length:', data.token?.length);
  return data.token;
}

/**
 * Notify backend that candidate has joined
 */
export async function notifyCandidateJoinedReview(
  reviewId: string,
  reviewToken: string
): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/api/project-review/${reviewId}/joined`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-review-token': reviewToken,
      },
    });
    
    if (!response.ok) {
      console.error('Failed to notify candidate joined:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to notify candidate joined:', error);
  }
}

/**
 * Complete the project review
 */
export async function completeProjectReview(
  reviewId: string,
  reviewToken: string
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/project-review/${reviewId}/complete`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-review-token': reviewToken,
      },
    });
  } catch (error) {
    console.error('Failed to complete project review:', error);
  }
}

/**
 * Get project review summary for ended page
 */
export async function getProjectReviewSummary(
  reviewId: string,
  reviewToken: string
): Promise<ProjectReviewSummary | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/project-review/${reviewId}/summary`, {
      headers: {
        'x-review-token': reviewToken,
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to get project review summary:', error);
    return null;
  }
}
