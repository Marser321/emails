'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { EmailHistoryEntry, EmailHistoryVersion } from '@/lib/types';

function changeSummary(current: EmailHistoryVersion, previous?: EmailHistoryVersion) {
  if (!previous) return 'Versión inicial';
  const changes: string[] = [];
  if (current.subject !== previous.subject) changes.push('asunto');
  if ((current.content.blocks || []).length !== (previous.content.blocks || []).length) changes.push('estructura');
  if (JSON.stringify(current.content.blocks || []) !== JSON.stringify(previous.content.blocks || [])) changes.push('contenido o estilos');
  if (current.htmlSnapshot !== previous.htmlSnapshot) changes.push('HTML');
  return changes.length ? `Cambios en ${changes.join(', ')}` : 'Sin cambios visibles';
}

export default function HistoryVersionsModal({ entry, onClose, onRestored, onToast }: { entry: EmailHistoryEntry; onClose: () => void; onRestored: (entry: EmailHistoryEntry) => void; onToast: (message: string, type?: 'success' | 'error') => void }) {
  const [versions, setVersions] = useState<EmailHistoryVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/history/${entry.id}/versions`).then(async response => { if (!response.ok) throw new Error(); setVersions(await response.json()); }).catch(() => onToast('No se pudieron cargar las versiones', 'error')).finally(() => setLoading(false)); }, [entry.id, onToast]);
  const restore = async (version: EmailHistoryVersion) => {
    setRestoring(version.id);
    try { const response = await fetch(`/api/history/${entry.id}/versions/${version.id}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId: entry.brandId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo restaurar'); onRestored(data.entry); onToast(`Versión ${version.version} restaurada`); onClose(); }
    catch (error) { onToast(error instanceof Error ? error.message : 'No se pudo restaurar', 'error'); } finally { setRestoring(null); }
  };
  return <div className="modal-overlay" onClick={onClose}><div className="glass-shell" onClick={event => event.stopPropagation()} style={{ width: 650, maxWidth: '94vw' }}><div className="glass-core" style={{ padding: 20, maxHeight: '80vh', overflowY: 'auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><div><p className="eyebrow" style={{ margin: 0 }}>Historial completo</p><h2 style={{ margin: '4px 0 0', fontSize: 18 }}>{entry.subject}</h2></div><button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>{loading ? <p>Cargando versiones…</p> : versions.length === 0 ? <p>No hay versiones guardadas todavía.</p> : <div style={{ display: 'grid', gap: 8 }}>{versions.map((version, index) => <div key={version.id} className="glass-shell"><div className="glass-core" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><strong style={{ fontSize: 12 }}>v{version.version} · {version.reason}</strong><p style={{ margin: '4px 0', fontSize: 11 }}>{changeSummary(version, versions[index + 1])}</p><small style={{ color: 'var(--text-muted)' }}>{new Date(version.createdAt).toLocaleString('es')}</small></div><button className="btn btn-secondary btn-sm" disabled={Boolean(restoring)} onClick={() => restore(version)}><RotateCcw size={13} /> {restoring === version.id ? 'Restaurando…' : 'Restaurar'}</button></div></div>)}</div>}</div></div></div>;
}
