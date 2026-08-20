/**
 * ElevenLabs API key (STT + TTS)
 */

export function getElevenLabsApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || '';
}
