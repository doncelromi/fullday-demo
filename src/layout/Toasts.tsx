import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '@/store';
import { cn } from '@/lib/utils';

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[9995] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:top-auto lg:items-end" data-no-print aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.kind === 'warn' ? AlertTriangle : t.kind === 'info' ? Info : CheckCircle2;
        return (
          <div key={t.id} className="fade-up pointer-events-auto flex w-full max-w-[380px] items-start gap-2.5 rounded-card border border-line bg-card px-3.5 py-3 text-sm text-ink shadow-md">
            <Icon size={18} className={cn('mt-px shrink-0', t.kind === 'warn' ? 'text-warn' : t.kind === 'info' ? 'text-accent' : 'text-ok')} />
            <span className="min-w-0 flex-1">{t.text}</span>
            <button onClick={() => dismiss(t.id)} className="-m-1 p-1 text-muted hover:text-ink" aria-label="Cerrar">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
