
import { Request, Response } from 'express';
import livekitService from '../services/livekit.service.js';

class LivekitController {
  async generateToken(req: Request, res: Response): Promise<void> {
    try {
      const { roomName, participantName, participantIdentity } = req.body;

      if (!roomName || !participantName) {
        res.status(400).json({ error: 'roomName and participantName are required' });
        return;
      }

      const token = await livekitService.generateToken({
        roomName,
        participantName,
        participantIdentity,
      });

      res.json({ token });
    } catch (error) {
      console.error('Error generating token:', error);
      res.status(500).json({ error: 'Failed to generate token' });
    }
  }
}

export default new LivekitController();
