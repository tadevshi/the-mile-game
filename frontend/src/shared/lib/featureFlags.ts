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
 *
 * O en .env (root):
 *   VITE_ENABLE_CORKBOARD=true
 */

export const FEATURES = {
  /**
   * Cartelera de Corcho — Feature sorpresa para la fiesta.
   * Habilitá esto el día de la fiesta seteando VITE_ENABLE_CORKBOARD=true
   * y redesplegar con: docker-compose up --build -d
   */
  CORKBOARD: import.meta.env.VITE_ENABLE_CORKBOARD === 'true',
} as const;
