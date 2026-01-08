export interface TokenRequest {
  roomName: string;
  participantName: string;
  participantIdentity?: string;
}

export interface TokenResponse {
  token: string;
}

export interface ErrorResponse {
  error: string;
}
