// Postcard from the API
export interface Postcard {
  id: string;
  player_id?: string;       // nullable para postales secretas
  sender_name?: string;     // sobreescribe player_name si está presente
  player_name: string;      // computado en backend (COALESCE sender_name, player.name)
  player_avatar: string;    // computado en backend ('🎁' para secretas)
  image_path: string;
  message: string;
  rotation: number;
  is_secret?: boolean;
  revealed_at?: string;
  created_at: string;
}

// Request to create a regular postcard (multipart form, not JSON)
export interface CreatePostcardPayload {
  image: File;
  message: string;
  senderName?: string; // opcional — permite "préstamo de celular"
}

// Request to create a secret postcard (multipart form, not JSON)
export interface CreateSecretPostcardPayload {
  image: File;
  message: string;
  senderName: string; // obligatorio para secretas
}

// Admin — estado de la Secret Box
export interface SecretBoxStatus {
  total: number;
  revealed: boolean;
  revealed_at?: string;
}
