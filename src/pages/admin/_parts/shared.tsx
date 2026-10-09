import { useEffect, useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedStatus, Lang, Propiedad } from '@/types';

/** Re-render periódico para que los "hace X min" avancen solos */
export function useNow(ms = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** 4,97 / 4.97 */
export const fmtRating = (n: number, lang: Lang) => n.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

/** Badge de canal conectado con estado del feed (✓ ok / ✗ error) */
export function ChannelBadge({ canal, feed, compact }: { canal: 'airbnb' | 'booking'; feed?: FeedStatus; compact?: boolean }) {
  if (!feed) return null;
  const err = feed.estado === 'error';
  return (
    <span
      className={cn(
        'pill border',
        canal === 'airbnb' ? 'border-airbnb/25 bg-airbnb/10 text-airbnb' : 'border-booking/25 bg-booking/10 text-booking',
        err && 'border-danger/40 bg-danger/10 text-danger',
      )}
      title={feed.url}
    >
      {err ? <X size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={3} />}
      {compact ? (canal === 'airbnb' ? 'Abnb' : 'Bkg') : canal === 'airbnb' ? 'Airbnb' : 'Booking'}
    </span>
  );
}

export function Channels({ p }: { p: Propiedad }) {
  if (!p.feeds.airbnb && !p.feeds.booking) return <span className="text-xs text-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      <ChannelBadge canal="airbnb" feed={p.feeds.airbnb} />
      <ChannelBadge canal="booking" feed={p.feeds.booking} />
    </div>
  );
}

/** Segmentado compacto para usar dentro de filas de tabla */
export function MiniSeg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full rounded-[9px] border border-line bg-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={(e) => {
            e.stopPropagation();
            onChange(o.value);
          }}
          className={cn(
            'inline-flex min-h-[32px] items-center justify-center whitespace-nowrap rounded-[7px] px-2 text-[11.5px] font-medium transition',
            value === o.value ? 'bg-card text-ink shadow-sm' : 'text-ink2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Spinner chico para botones */
export function Spin({ className }: { className?: string }) {
  return <span className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />;
}

/** Punto verde pulsante "en vivo" */
export function LiveDot({ tone = 'ok' }: { tone?: 'ok' | 'danger' | 'warn' }) {
  const c = tone === 'ok' ? 'bg-ok' : tone === 'danger' ? 'bg-danger' : 'bg-warn';
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
      <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', c)} />
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', c)} />
    </span>
  );
}

export const truncUrl = (u: string, n = 38) => {
  const s = u.replace(/^https?:\/\//, '');
  return s.length > n ? s.slice(0, n - 12) + '…' + s.slice(-11) : s;
};
