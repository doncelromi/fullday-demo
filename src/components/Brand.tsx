import { cn } from '@/lib/utils';

/** Logo oficial de Full Day (Go!) en círculo. Fondo blanco propio: funciona en ambos temas. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src={size > 96 ? '/brand/logo.png' : '/brand/logo-192.png'}
      alt="Full Day Go!"
      width={size}
      height={size}
      className={cn('shrink-0 select-none rounded-full bg-white shadow-sm ring-1 ring-black/5', className)}
      draggable={false}
    />
  );
}

export function Logo({ className, size = 30, sub }: { className?: string; size?: number; sub?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-extrabold tracking-tight text-navy">
          Full<span className="text-accent">Day</span>
        </span>
        {sub && <span className="mt-0.5 text-[10.5px] font-medium text-muted">{sub}</span>}
      </span>
    </span>
  );
}

export function DemoPill({ className }: { className?: string }) {
  return (
    <span className={cn('pill border border-accent/30 bg-accent-soft text-accent', className)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      DEMO PREVIEW
    </span>
  );
}
