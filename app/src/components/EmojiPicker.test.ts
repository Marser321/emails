import { describe, expect, it } from 'vitest';
import { applyEmojiInsertion } from './EmojiPicker';

describe('emoji insertion', () => {
  it('inserts at the cursor and returns the next caret position', () => {
    expect(applyEmojiInsertion('Oferta HOY', '🎯', 6, 6)).toEqual({ value: 'Oferta🎯 HOY', cursor: 8 });
  });

  it('replaces the selected text', () => {
    expect(applyEmojiInsertion('Antes texto después', '✅', 6, 11)).toEqual({ value: 'Antes ✅ después', cursor: 7 });
  });
});
