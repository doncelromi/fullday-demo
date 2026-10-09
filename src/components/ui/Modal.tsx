import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal centrado con `fixed inset-0 m-auto h-fit` (nunca translate -50%).
 * Animación de entrada con propiedades individuales scale/translate/opacity.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  closeOnBackdrop = true,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  closeOnBackdrop?: boolean;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeOnBackdrop && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, closeOnBackdrop]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]" data-no-print>
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'modal-in fixed inset-0 m-auto flex h-fit max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-md',
          className,
        )}
        style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      >
        {title !== undefined && (
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 text-base font-semibold text-ink">{title}</div>
            <button className="icon-btn -mr-2 -mt-1 shrink-0" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Sheet desde abajo (mobile) */
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]" data-no-print>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="sheet-in absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[20px] border-t border-line bg-card shadow-md">
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line-strong" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pb-2">
            <div className="text-base font-semibold">{title}</div>
            <button className="icon-btn -mr-2" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Panel lateral de detalle */
export function SidePanel({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[75]" data-no-print>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="panel-in absolute bottom-0 right-0 top-0 flex w-[min(92vw,460px)] flex-col border-l border-line bg-card shadow-md">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 text-base font-semibold">{title}</div>
          <button className="icon-btn -mr-2 -mt-1 shrink-0" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
