import { api } from '@/shared/lib/api';
import type { Postcard } from '../types/postcards.types';

// Service layer — orquesta llamadas al API client
export const postcardService = {
  async fetchAll(): Promise<Postcard[]> {
    return api.listPostcards();
  },

  async create(file: File, message: string, senderName?: string): Promise<Postcard> {
    // Si es video, no redimensionar (videos no se pueden redimensionar igual que imágenes)
    if (file.type.startsWith('video/')) {
      return api.createPostcard(file, message, senderName);
    }
    // Para imágenes, redimensionar antes de subir
    const resized = await this.resizeImage(file);
    return api.createPostcard(resized, message, senderName);
  },

  async createSecret(file: File, message: string, senderName: string, token: string): Promise<Postcard> {
    // Videos no se redimensionan
    if (file.type.startsWith('video/')) {
      return api.createSecretPostcard(file, message, senderName, token);
    }
    const resized = await this.resizeImage(file);
    return api.createSecretPostcard(resized, message, senderName, token);
  },

  /**
   * Redimensiona una imagen antes de subirla.
   * Los celulares modernos sacan fotos de 10MB+ — no tiene sentido subir eso.
   * Max 1200px en el lado más largo, calidad 0.85 JPEG.
   */
  async resizeImage(file: File, maxSize = 1200): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        let { width, height } = img;

        // Solo redimensionar si excede el máximo
        if (width <= maxSize && height <= maxSize) {
          resolve(file);
          return;
        }

        // Calcular nuevas dimensiones manteniendo aspect ratio
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback: subir original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const resized = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resized);
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for resizing'));
      };

      img.src = url;
    });
  },
};
