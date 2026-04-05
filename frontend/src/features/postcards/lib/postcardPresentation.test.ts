import { describe, it, expect } from 'vitest';
import { getPostcardPresentation } from './postcardPresentation';
import type { Postcard } from '../types/postcards.types';

function makePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    id: 'test-id',
    player_id: 'player-1',
    player_name: 'Test User',
    player_avatar: '🎭',
    image_path: '/postcards/test.jpg',
    message: '',
    rotation: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getPostcardPresentation', () => {
  it('returns photo mode when message is empty', () => {
    const postcard = makePostcard({ message: '' });
    const result = getPostcardPresentation(postcard);

    expect(result).toEqual({
      mode: 'photo',
      hasMessage: false,
      captionName: 'Test User',
    });
  });

  it('returns photo mode when message is whitespace only', () => {
    const postcard = makePostcard({ message: '   ' });
    const result = getPostcardPresentation(postcard);

    expect(result).toEqual({
      mode: 'photo',
      hasMessage: false,
      captionName: 'Test User',
    });
  });

  it('returns photo mode when message is tabs and newlines', () => {
    const postcard = makePostcard({ message: '\t\n  ' });
    const result = getPostcardPresentation(postcard);

    expect(result).toEqual({
      mode: 'photo',
      hasMessage: false,
      captionName: 'Test User',
    });
  });

  it('returns postcard mode when message has content', () => {
    const postcard = makePostcard({ message: 'Te queremos mucho' });
    const result = getPostcardPresentation(postcard);

    expect(result).toEqual({
      mode: 'postcard',
      hasMessage: true,
      captionName: 'Test User',
    });
  });

  it('returns postcard mode when message has content with surrounding whitespace', () => {
    const postcard = makePostcard({ message: '  Hola!  ' });
    const result = getPostcardPresentation(postcard);

    expect(result).toEqual({
      mode: 'postcard',
      hasMessage: true,
      captionName: 'Test User',
    });
  });

  it('uses sender_name as captionName when available', () => {
    const postcard = makePostcard({
      message: '',
      sender_name: 'Secret Sender',
      player_name: 'Player Name',
    });
    const result = getPostcardPresentation(postcard);

    expect(result.captionName).toBe('Secret Sender');
    expect(result.mode).toBe('photo');
  });

  it('falls back to player_name when sender_name is undefined', () => {
    const postcard = makePostcard({
      message: '',
      sender_name: undefined,
      player_name: 'Player Name',
    });
    const result = getPostcardPresentation(postcard);

    expect(result.captionName).toBe('Player Name');
  });

  it('falls back to player_name when sender_name is empty string', () => {
    const postcard = makePostcard({
      message: '',
      sender_name: '',
      player_name: 'Player Name',
    });
    const result = getPostcardPresentation(postcard);

    // Empty string is falsy in JS, so || falls back to player_name
    expect(result.captionName).toBe('Player Name');
  });
});
