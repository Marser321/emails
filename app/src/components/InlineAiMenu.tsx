'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';

export type AiRefineCommand = 'optimize' | 'shorten' | 'casual' | 'formal' | 'rewrite';
const actions: { command: AiRefineCommand; label: string }[] = [
  { command: 'optimize', label: 'Optimizar' }, { command: 'shorten', label: 'Acortar' },
  { command: 'casual', label: 'Tono cercano' }, { command: 'formal', label: 'Tono formal' },
  { command: 'rewrite', label: 'Reescribir con otro ángulo' },
];

export default function InlineAiMenu({ pending = false, disabled = false, onAction }: { pending?: boolean; disabled?: boolean; onAction: (command: AiRefineCommand) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  return <div ref={rootRef} className="inline-ai-menu">
    <button type="button" className="btn btn-ghost btn-sm inline-ai-trigger" aria-haspopup="menu" aria-expanded={open} disabled={pending || disabled} onClick={() => setOpen(value => !value)}>
      {pending ? <Loader2 size={13} className="spin" /> : <Bot size={13} />} IA
    </button>
    {open ? <div role="menu" className="inline-ai-popover">
      {actions.map(action => <button key={action.command} type="button" role="menuitem" onClick={() => { setOpen(false); void onAction(action.command); }}>{action.label}</button>)}
    </div> : null}
  </div>;
}
