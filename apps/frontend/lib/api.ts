/**
 * Interview API Service
 */

import { config } from './config';
import type { Interview } from '@/types';

const BASE_URL = config.backend.url;

export interface TokenResponse {
  token: string;
}

export interface JoinedResponse {
  success: boolean;
  message: string;
  status: string;
}

export interface ValidateResponse extends Interview {}

/**
 * Validate interview by roomId and token
 */
export async function validateInterview(
  roomId: string, 
  token: string
): Promise<Interview | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/interview/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, token }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to validate interview:', error);
    return null;
  }
}

/**
 * Get LiveKit token for joining the room
 */
export async function getInterviewToken(
  interviewId: string,
  interviewToken: string,
  roomId: string,
  participantName: string,
  participantIdentity: string
): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/interview/${interviewId}/token`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-interview-token': interviewToken,
    },
    body: JSON.stringify({
      roomId,
      participantName,
      participantIdentity,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get room token');
  }

  const data: TokenResponse = await response.json();
  return data.token;
}

/**
 * Notify backend that candidate has joined
 * This triggers the proctoring service to start monitoring
 */
export async function notifyCandidateJoined(
  interviewId: string,
  interviewToken: string
): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/api/interview/${interviewId}/joined`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-interview-token': interviewToken,
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
 * Complete the interview
 */
export async function completeInterview(
  interviewId: string,
  interviewToken: string
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/interview/${interviewId}/complete`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-interview-token': interviewToken,
      },
    });
  } catch (error) {
    console.error('Failed to complete interview:', error);
  }
}

export interface InterviewSummary {
  candidate: {
    name: string;
    email: string;
  };
  position: string;
  status: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;
  expectedDuration: number;
}

/**
 * Get interview summary for ended page
 */
export async function getInterviewSummary(
  interviewId: string
): Promise<InterviewSummary | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/interview/${interviewId}/summary`);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to get interview summary:', error);
    return null;
  }
}
