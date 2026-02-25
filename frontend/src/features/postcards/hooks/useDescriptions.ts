import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';

const MAX_STAMPS = 8;

/**
 * Fetches anonymous descriptions for stamp display on the corkboard.
 * Returns up to MAX_STAMPS randomly shuffled descriptions.
 */
export function useDescriptions() {
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .getDescriptions()
      .then((all) => {
        if (cancelled) return;
        // Fisher-Yates shuffle → take up to MAX_STAMPS
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        setDescriptions(shuffled.slice(0, MAX_STAMPS));
      })
      .catch(() => {
        if (!cancelled) setDescriptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { descriptions, isLoading };
}
