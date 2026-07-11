'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, Clipboard, Copy, FilePenLine, ThumbsDown, ThumbsUp } from 'lucide-react';
import EmailThumbnail from '@/components/EmailThumbnail';
import { EmailHistoryEntry } from '@/lib/types';

interface EmailHistoryCardProps {
  entry: EmailHistoryEntry;
  brandName: string;
  onRated: (entry: EmailHistoryEntry) => void;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function EmailHistoryCard({ entry, brandName, onRated, onToast }: EmailHistoryCardProps) {
  const router = useRouter();
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    if (!entry.htmlSnapshot) {
      onToast('Este email no tiene HTML guardado todavía — ábrelo en el editor', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(entry.htmlSnapshot);
      onToast('HTML copiado al portapapeles');
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1800);
    } catch {
      onToast('Error al copiar', 'error');
    }
  };

  const handleRate = async (rating: 'up' | 'down') => {
    const next = entry.rating === rating ? null : rating;
    try {
      const res = await fetch(`/api/history/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: entry.brandId, rating: next }),
      });
      if (!res.ok) throw new Error();
      onRated({ ...entry, rating: next });
    } catch {
      onToast('Error al guardar la valoración', 'error');
    }
  };

  return (
    <div className="glass-shell" style={{ padding: 4, width: 300, flexShrink: 0 }}>
      <div className="glass-core" style={{ padding: 12, display: 'flex', gap: 12 }}>
        <EmailThumbnail html={entry.htmlSnapshot} width={90} height={118} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {entry.subject || '(sin asunto)'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Building2 size={11} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {brandName} · {relativeDate(entry.createdAt)}
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 'auto' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleRate('up')}
              title="Me gustó — la IA aprende de este email"
              style={{
                padding: '2px 7px', fontSize: 11, height: 24,
                background: entry.rating === 'up' ? 'rgba(52, 211, 153, 0.15)' : undefined,
                borderColor: entry.rating === 'up' ? 'rgba(52, 211, 153, 0.4)' : undefined,
              }}
            >
              <ThumbsUp size={13} fill={entry.rating === 'up' ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleRate('down')}
              title="No me gustó"
              style={{
                padding: '2px 7px', fontSize: 11, height: 24,
                background: entry.rating === 'down' ? 'rgba(248, 113, 113, 0.15)' : undefined,
                borderColor: entry.rating === 'down' ? 'rgba(248, 113, 113, 0.4)' : undefined,
              }}
            >
              <ThumbsDown size={13} fill={entry.rating === 'down' ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm action-feedback-btn ${justCopied ? 'is-confirmed' : 'btn-secondary'}`}
              onClick={handleCopy}
              title="Copiar HTML"
              style={{ padding: '2px 7px', fontSize: 10, height: 24 }}
            >
              {justCopied ? <><Check size={12} /> ¡Copiado!</> : <><Clipboard size={12} /> Copiar</>}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => router.push(`/editor?emailId=${entry.id}&brandId=${entry.brandId}`)}
              title="Reabrir en el editor"
              style={{ padding: '2px 7px', fontSize: 10, height: 24 }}
            >
              <FilePenLine size={12} /> Abrir
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => router.push(`/editor?emailId=${entry.id}&brandId=${entry.brandId}&duplicate=1`)}
              title="Duplicar como email nuevo"
              style={{ padding: '2px 7px', fontSize: 10, height: 24 }}
            >
              <Copy size={12} /> Duplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
