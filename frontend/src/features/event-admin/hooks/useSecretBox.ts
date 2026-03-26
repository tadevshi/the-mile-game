import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { secretBoxApi } from '../services/secretBoxApi';
import type { SecretBoxStatusWithToken } from '../types/secretBox.types';

// Hook to get secret box status with token
export function useSecretBoxToken(slug: string) {
  return useQuery({
    queryKey: ['secret-box-status', slug],
    queryFn: async (): Promise<SecretBoxStatusWithToken> => {
      const [tokenData, postcardsData] = await Promise.all([
        secretBoxApi.getSecretBoxToken(slug),
        secretBoxApi.getSecretPostcards(slug),
      ]);

      return {
        token: tokenData.token,
        shareUrl: tokenData.shareUrl,
        secretCount: postcardsData.total,
        revealed: postcardsData.revealed,
        postcards: postcardsData.postcards,
      };
    },
    enabled: !!slug,
    staleTime: 30000, // 30 seconds
  });
}

// Hook to regenerate secret box token
export function useRegenerateSecretBoxToken(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => secretBoxApi.regenerateSecretBoxToken(slug),
    onSuccess: () => {
      // Invalidate token query to refetch
      queryClient.invalidateQueries({ queryKey: ['secret-box-token', slug] });
      queryClient.invalidateQueries({ queryKey: ['secret-box-status', slug] });
    },
  });
}

// Hook to get secret postcards
export function useSecretPostcards(slug: string) {
  return useQuery({
    queryKey: ['secret-postcards', slug],
    queryFn: () => secretBoxApi.getSecretPostcards(slug),
    enabled: !!slug,
    staleTime: 10000, // 10 seconds
  });
}

// Hook to reveal secret box
export function useRevealSecretBox(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => secretBoxApi.revealSecretBox(slug),
    onSuccess: () => {
      // Invalidate postcards to refetch
      queryClient.invalidateQueries({ queryKey: ['secret-postcards', slug] });
      queryClient.invalidateQueries({ queryKey: ['secret-box-status', slug] });
    },
  });
}
