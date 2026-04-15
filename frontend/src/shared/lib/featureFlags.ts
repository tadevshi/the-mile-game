/**
 * Feature Flags
 *
 * Las variables de entorno Vite (VITE_*) se hornean en el bundle en build time.
 * Para habilitar un feature en producción, hay que reconstruir con la variable seteada.
 *
 * Uso en docker-compose.yml:
 *   build:
 *     args:
 *       VITE_ENABLE_CORKBOARD: "true"
 *       VITE_ENABLE_SECRET_BOX: "true"
 *
 * O en .env (root):
 *   VITE_ENABLE_CORKBOARD=true
 *   VITE_ENABLE_SECRET_BOX=true
 */

export const FEATURES = {
  /**
   * Cartelera de Corcho — Feature sorpresa para la fiesta.
   * Habilitá esto el día de la fiesta seteando VITE_ENABLE_CORKBOARD=true
   * y redesplegar con: docker-compose up --build -d
   */
  CORKBOARD: import.meta.env.VITE_ENABLE_CORKBOARD === 'true',

  /**
   * Secret Box — Formulario para postales de personas que no pueden asistir.
   * Habilitar ANTES de la fiesta para que el link funcione.
   * La ruta /secret-box?token=TOKEN solo funciona si este flag está activo.
   */
  SECRET_BOX: import.meta.env.VITE_ENABLE_SECRET_BOX === 'true',

  /**
   * Google Drive Backup — Permite conectar Google Drive para respaldar
   * automáticamente las fotos/videos de la cartelera.
   * Habilitar seteando VITE_ENABLE_GOOGLE_DRIVE_BACKUP=true y reconstruir.
   */
  GOOGLE_DRIVE: import.meta.env.VITE_ENABLE_GOOGLE_DRIVE_BACKUP === 'true',
} as const;
