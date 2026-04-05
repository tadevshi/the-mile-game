import { useCallback, useState } from 'react';
import { postcardService } from '../services/postcardApi';

interface UseSecretBoxSubmissionParams {
  token: string;
  slug?: string;
}

export function useSecretBoxSubmission({ token, slug }: UseSecretBoxSubmissionParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitSecretPostcard = useCallback(async (
    mediaFile: File,
    message: string,
    senderName: string
  ) => {
    setIsSubmitting(true);

    try {
      const fileToUpload = mediaFile.type.startsWith('video/')
        ? mediaFile
        : await postcardService.resizeImage(mediaFile);

      await postcardService.createSecret(fileToUpload, message.trim(), senderName.trim(), token, slug);
    } finally {
      setIsSubmitting(false);
    }
  }, [slug, token]);

  return {
    isSubmitting,
    submitSecretPostcard,
  };
}
