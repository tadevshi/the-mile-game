import { describe, expect, it } from 'vitest';
import { getPostcardStyle } from './api';

describe('getPostcardStyle', () => {
  it('defaults missing and invalid values to classic', () => {
    expect(getPostcardStyle(undefined)).toBe('classic');
    expect(getPostcardStyle('instant')).toBe('classic');
  });

  it('accepts polaroid', () => {
    expect(getPostcardStyle('polaroid')).toBe('polaroid');
  });
});
