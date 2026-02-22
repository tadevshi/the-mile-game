// Postcard from the API
export interface Postcard {
  id: string;
  player_id: string;
  player_name: string;
  player_avatar: string;
  image_path: string;
  message: string;
  rotation: number;
  created_at: string;
}

// Request to create a postcard (multipart form, not JSON)
export interface CreatePostcardPayload {
  image: File;
  message: string;
}
