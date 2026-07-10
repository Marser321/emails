'use client';

import { Mail } from 'lucide-react';

// Miniatura fiel del email: iframe con el HTML real escalado — sin dependencias
interface EmailThumbnailProps {
  html: string;
  width?: number;
  height?: number;
}

export default function EmailThumbnail({ html, width = 120, height = 150 }: EmailThumbnailProps) {
  const scale = width / 600;
  if (!html) {
    return (
      <div
        style={{
          width, height, borderRadius: 8, background: 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, border: '1px solid var(--border-subtle)', flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <Mail size={24} />
      </div>
    );
  }
  return (
    <div style={{ width, height, overflow: 'hidden', borderRadius: 8, border: '1px solid var(--border-subtle)', background: '#ffffff', flexShrink: 0, position: 'relative' }}>
      <iframe
        srcDoc={html}
        sandbox=""
        tabIndex={-1}
        title="Vista previa del email"
        style={{
          width: 600,
          height: height / scale,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
          border: 0,
          display: 'block',
        }}
      />
    </div>
  );
}
