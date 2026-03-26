import type { Postcard } from '@features/postcards/types/postcards.types';

// Response from GET /api/admin/events/:slug/secret-box/token
export interface SecretBoxTokenResponse {
  token: string;
  share_url: string;
}

// Response from GET /api/admin/events/:slug/secret-box (list postcards)
export interface SecretBoxPostcardsResponse {
  postcards: Postcard[];
  total: number;
  revealed: boolean;
}

// Request for regenerating token (POST, no body needed but for consistency)
export interface RegenerateTokenRequest {}

// Secret Box status with token info
export interface SecretBoxStatusWithToken {
  token: string | null;
  shareUrl: string;
  secretCount: number;
  revealed: boolean;
  postcards: Postcard[];
}
