import { config } from '../config';

/**
 * Proctoring ML Service Client
 * 
 * Communicates with the Python ML service to request
 * room monitoring for proctoring.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

interface JoinResponse {
  success: boolean;
  room_name: string;
  message: string;
}

interface StatusResponse {
  active_rooms: string[];
  total_sessions: number;
}

/**
 * Request ML service to start monitoring a room
 */
export async function requestProctoring(roomName: string): Promise<JoinResponse> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room_name: roomName,
        participant_identity: 'ml-proctoring',
      }),
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }

    const data = await response.json() as JoinResponse;
    console.log(`🔍 ML Proctoring requested for room: ${roomName}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to request proctoring for ${roomName}:`, error);
    throw error;
  }
}

/**
 * Request ML service to stop monitoring a room
 */
export async function stopProctoring(roomName: string): Promise<JoinResponse> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room_name: roomName,
      }),
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }

    const data = await response.json() as JoinResponse;
    console.log(`👋 ML Proctoring stopped for room: ${roomName}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to stop proctoring for ${roomName}:`, error);
    throw error;
  }
}

/**
 * Get ML service status
 */
export async function getProctoringStatus(): Promise<StatusResponse> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/status`);
    
    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }

    return await response.json() as StatusResponse;
  } catch (error) {
    console.error('❌ Failed to get ML service status:', error);
    throw error;
  }
}

/**
 * Check if ML service is healthy
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
