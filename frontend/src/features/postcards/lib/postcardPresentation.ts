import type { Postcard, PresentationMode } from '../types/postcards.types';

export interface PostcardPresentation {
  mode: PresentationMode;
  hasMessage: boolean;
  captionName: string;
}

/**
 * Derives presentation mode from a postcard's content.
 *
 * - Returns 'postcard' when the postcard has a meaningful message.
 * - Returns 'photo' when the message is empty or whitespace-only.
 *
 * The captionName is the sender/player name to display beneath the media.
 */
export function getPostcardPresentation(postcard: Postcard): PostcardPresentation {
  const hasMessage = postcard.message.trim().length > 0;

  return {
    mode: hasMessage ? 'postcard' : 'photo',
    hasMessage,
    captionName: postcard.sender_name || postcard.player_name,
  };
}
