import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export interface TokenOptions {
  roomName: string;
  participantName: string;
  participantIdentity?: string;
  ttl?: number; // Token time-to-live in seconds
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
}

class LivekitService {
  private apiKey: string;
  private apiSecret: string;
  private livekitUrl: string;
  private isConfigured: boolean;
  private roomService: RoomServiceClient | null = null;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY || '';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || '';
    const wsUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
    // Convert WSS/WS to HTTPS/HTTP for API calls
    this.livekitUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    this.isConfigured = !!(this.apiKey && this.apiSecret);

    if (!this.isConfigured) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('LiveKit API credentials not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET.');
      } else {
        console.warn('⚠️  LiveKit API credentials not configured. Token generation will fail.');
      }
    } else {
      this.roomService = new RoomServiceClient(this.livekitUrl, this.apiKey, this.apiSecret);
    }
  }

  /**
   * Check if LiveKit is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate a LiveKit access token
   */
  async generateToken(options: TokenOptions): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('LiveKit not configured');
    }

    const {
      roomName,
      participantName,
      participantIdentity,
      ttl = 3600, // Default 1 hour
      canPublish = true,
      canSubscribe = true,
      canPublishData = true,
    } = options;

    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantIdentity || participantName,
      name: participantName,
      ttl,
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe,
      canPublishData,
    });

    return await token.toJwt();
  }

  /**
   * Generate a token with limited permissions (for observers)
   */
  async generateObserverToken(roomName: string, observerName: string): Promise<string> {
    return this.generateToken({
      roomName,
      participantName: observerName,
      canPublish: false,
      canSubscribe: true,
      canPublishData: false,
    });
  }

  /**
   * Delete/close a room - removes all participants and closes the room
   * Per doc: Ensure LiveKit room closes properly on terminate
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.isConfigured || !this.roomService) {
      console.warn('[LiveKit] Cannot delete room - not configured');
      return false;
    }

    try {
      await this.roomService.deleteRoom(roomName);
      console.log(`[LiveKit] Room ${roomName} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`[LiveKit] Failed to delete room ${roomName}:`, error);
      return false;
    }
  }

  /**
   * Remove a participant from a room
   */
  async removeParticipant(roomName: string, identity: string): Promise<boolean> {
    if (!this.isConfigured || !this.roomService) {
      console.warn('[LiveKit] Cannot remove participant - not configured');
      return false;
    }

    try {
      await this.roomService.removeParticipant(roomName, identity);
      console.log(`[LiveKit] Participant ${identity} removed from room ${roomName}`);
      return true;
    } catch (error) {
      console.error(`[LiveKit] Failed to remove participant ${identity}:`, error);
      return false;
    }
  }

  /**
   * List participants in a room
   */
  async listParticipants(roomName: string): Promise<Array<{ identity: string; name: string }>> {
    if (!this.isConfigured || !this.roomService) {
      return [];
    }

    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants.map(p => ({
        identity: p.identity,
        name: p.name,
      }));
    } catch (error) {
      console.error(`[LiveKit] Failed to list participants in ${roomName}:`, error);
      return [];
    }
  }

  /**
   * Check if a room exists
   */
  async roomExists(roomName: string): Promise<boolean> {
    if (!this.isConfigured || !this.roomService) {
      return false;
    }

    try {
      const rooms = await this.roomService.listRooms([roomName]);
      return rooms.length > 0;
    } catch (error) {
      console.error(`[LiveKit] Failed to check room ${roomName}:`, error);
      return false;
    }
  }
}

export default new LivekitService();
