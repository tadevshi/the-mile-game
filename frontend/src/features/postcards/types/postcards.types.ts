// Postcard from the API
export interface Postcard {
  id: string;
  player_id?: string;       // nullable para postales secretas
  sender_name?: string;     // sobreescribe player_name si está presente
  player_name: string;      // computado en backend (COALESCE sender_name, player.name)
  player_avatar: string;    // computado en backend ('🎁' para secretas)
  image_path: string;       // video_path para videos
  message: string;
  rotation: number;
  is_secret?: boolean;
  revealed_at?: string;
  created_at: string;
  // Video postcard fields
  media_type?: 'image' | 'video';
  thumbnail_path?: string;
  media_duration_ms?: number;
}

// Request to create a regular postcard (multipart form, not JSON)
export interface CreatePostcardPayload {
  media?: File;            // nuevo: acepta imagen o video
  image?: File;             // legacy: solo imágenes
  message: string;
  senderName?: string;     // opcional — permite "préstamo de celular"
}

// Request to create a secret postcard (multipart form, not JSON)
export interface CreateSecretPostcardPayload {
  media?: File;            // nuevo: acepta imagen o video
  image?: File;            // legacy: solo imágenes
  message: string;
  senderName: string;      // obligatorio para secretas
}

// Admin — estado de la Secret Box
export interface SecretBoxStatus {
  total: number;
  revealed: boolean;
  revealed_at?: string;
}
