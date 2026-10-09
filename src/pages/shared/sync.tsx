import { useEffect, useState } from 'react';
import { useApp } from '@/store';
import { cn } from '@/lib/utils';

/** Minutos desde la última sincronización iCal (se refresca cada 30 s) */
export function useSyncMin() {
  const syncedAt = useApp((s) => s.syncedAt);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(0, Math.floor((Date.now() - syncedAt) / 60000));
}

/** Punto verde con pulso ("en vivo") */
export function LiveDot({ className, tone = 'ok' }: { className?: string; tone?: 'ok' | 'warn' }) {
  return (
    <span className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', className)} aria-hidden>
      <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', tone === 'ok' ? 'bg-ok' : 'bg-warn')} />
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', tone === 'ok' ? 'bg-ok' : 'bg-warn')} />
    </span>
  );
}
