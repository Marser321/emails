'use client';

import { useEffect, useRef, useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  label?: string;
}

const EMOJI_GROUPS = [
  { name: 'Marketing', emojis: ['🎯', '📣', '📢', '🎁', '🎉', '🎊', '✨', '💡', '🛠️', '🚀', '🛒', '🏷️', '📌', '📋', '📧', '📱'] },
  { name: 'Urgencia', emojis: ['🔥', '⏰', '⏳', '⌛', '⚡', '🚨', '⚠️', '❗', '❕', '🔔', '💥', '🏃', '💨', '🔒', '📅', '🕛'] },
  { name: 'Dinero', emojis: ['💰', '💵', '💸', '💳', '🪙', '💲', '📈', '📉', '🏦', '🤑', '🛍️', '🧾', '💱', '💎', '🏆', '🌟'] },
  { name: 'Positivos', emojis: ['✅', '☑️', '👍', '🙌', '👏', '🤝', '💪', '😊', '🤩', '🥳', '❤️', '💚', '💙', '🛡️', '🎈', '🍀'] },
  { name: 'Flechas', emojis: ['➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↪️', '↩️', '➡', '➤', '➥', '➦', '➧', '➨', '👉', '👇'] },
] as const;

export function applyEmojiInsertion(value: string, emoji: string, start: number, end: number) {
  return {
    value: `${value.slice(0, start)}${emoji}${value.slice(end)}`,
    cursor: start + emoji.length,
  };
}

export function insertEmojiAtFocusedField(emoji: string): void {
  const element = document.activeElement;
  if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return;
  if (element.readOnly || element.disabled) return;

  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  const insertion = applyEmojiInsertion(element.value, emoji, start, end);
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  valueSetter?.call(element, insertion.value);
  element.dispatchEvent(new Event('input', { bubbles: true }));

  requestAnimationFrame(() => {
    element.focus();
    element.setSelectionRange(insertion.cursor, insertion.cursor);
  });
}

export default function EmojiPicker({ onSelect, label = 'Insertar emoji' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<{ element: HTMLInputElement | HTMLTextAreaElement; start: number; end: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const selectEmoji = (emoji: string) => {
    const selection = selectionRef.current;
    if (selection?.element.isConnected) {
      selection.element.focus({ preventScroll: true });
      selection.element.setSelectionRange(selection.start, selection.end);
    }
    onSelect(emoji);
    setIsOpen(false);
  };

  const preserveFocusedSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    const element = document.activeElement;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      selectionRef.current = {
        element,
        start: element.selectionStart ?? element.value.length,
        end: element.selectionEnd ?? element.value.length,
      };
    }
    event.preventDefault();
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        className="btn btn-ghost btn-sm"
        style={{ padding: '2px 7px', fontSize: 15, lineHeight: 1, height: 24, minWidth: 28, opacity: 0.8 }}
        onMouseDown={preserveFocusedSelection}
        onClick={() => setIsOpen(open => !open)}
      >
        😀
      </button>
      {isOpen ? (
        <div
          role="dialog"
          aria-label="Selector de emojis"
          className="glass-shell"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 5px)', zIndex: 100, width: 300, maxHeight: 340, overflowY: 'auto', padding: 8, boxShadow: 'var(--shadow-lg)' }}
          onMouseDown={event => event.preventDefault()}
        >
          <div className="glass-core" style={{ padding: 8 }}>
            {EMOJI_GROUPS.map(group => (
              <section key={group.name} style={{ marginBottom: 10 }}>
                <div style={{ marginBottom: 5, color: 'var(--text-muted)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{group.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
                  {group.emojis.map((emoji, index) => (
                    <button
                      key={`${group.name}-${index}`}
                      type="button"
                      aria-label={`${group.name}: ${emoji}`}
                      title={emoji}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => selectEmoji(emoji)}
                      style={{ width: 30, height: 30, padding: 0, border: '1px solid transparent', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 19, lineHeight: 1 }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
