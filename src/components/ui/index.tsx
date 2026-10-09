import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as SwitchPrim from '@radix-ui/react-switch';
import { Award, ChevronDown, ChevronUp, Info, MoreHorizontal, TrendingDown, TrendingUp, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { photoFallback } from '@/data/properties';
import type { EstadoPago, EstadoReserva, Identidad, Origen, Role } from '@/types';

export { Modal, Sheet, SidePanel } from './Modal';

/* ---------- Encabezado de página con kicker de rol ---------- */
export function PageHeader({ title, subtitle, actions, kicker }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; kicker?: string | false }) {
  const role = useApp((s) => s.role);
  const { t } = useT();
  const color = role === 'propietario' ? 'var(--gold)' : 'var(--accent)';
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker !== false && (
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color }}>
            {role === 'propietario' ? <Award size={13} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
            {kicker ?? t('kicker.' + role)}
          </div>
        )}
        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-ink2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- KPI ---------- */
export function KpiCard({ label, value, delta, deltaDir, hint, onClick, icon }: { label: string; value: ReactNode; delta?: string; deltaDir?: 'up' | 'down'; hint?: ReactNode; onClick?: () => void; icon?: ReactNode }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={cn('card flex min-h-[116px] min-w-0 flex-col justify-between p-4 text-left transition', onClick && 'hover:border-line-strong hover:shadow-md')}>
      <div className="flex items-start justify-between gap-2">
        <div className="kpi-label">{label}</div>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="kpi-value">{value}</div>
        {delta && (
          <span className={cn('pill mb-0.5', deltaDir === 'down' ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok')}>
            {deltaDir === 'down' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {delta}
          </span>
        )}
      </div>
      {hint && <div className="mt-1.5 text-xs text-ink2">{hint}</div>}
    </Comp>
  );
}

/* ---------- Badge genérico ---------- */
export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info' | 'muted' | 'airbnb' | 'booking' | 'gold';
const TONES: Record<Tone, string> = {
  neutral: 'bg-subtle text-ink2 border border-line',
  accent: 'bg-accent-soft text-accent',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  muted: 'bg-subtle text-muted border border-line',
  airbnb: 'bg-airbnb/10 text-airbnb',
  booking: 'bg-booking/10 text-booking',
  gold: 'bg-gold/15 text-gold',
};
export function Badge({ children, tone = 'neutral', className, dot }: { children: ReactNode; tone?: Tone; className?: string; dot?: boolean }) {
  return (
    <span className={cn('pill', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const estadoTone: Record<EstadoReserva, Tone> = { pendiente: 'warn', confirmada: 'ok', cancelada: 'danger', finalizada: 'muted' };
const origenTone: Record<Origen, Tone> = { fullday: 'accent', airbnb: 'airbnb', booking: 'booking', bloqueo: 'muted' };
const idTone: Record<Identidad, Tone> = { validada: 'ok', revision: 'warn', rechazada: 'danger', 'n/a': 'muted' };
const pagoTone: Record<EstadoPago, Tone> = { aprobado: 'ok', pendiente: 'warn', rechazado: 'danger', expirado: 'muted' };

export function EstadoPill({ v }: { v: EstadoReserva }) {
  const { e } = useT();
  return <Badge tone={estadoTone[v]} dot>{e('estado', v)}</Badge>;
}
export function OrigenPill({ v, short }: { v: Origen; short?: boolean }) {
  const { e } = useT();
  return <Badge tone={origenTone[v]}>{short && v === 'bloqueo' ? '—' : e('origen', v)}</Badge>;
}
export function IdentidadPill({ v }: { v: Identidad }) {
  const { e } = useT();
  if (v === 'n/a') return <span className="text-xs text-muted">—</span>;
  return <Badge tone={idTone[v]} dot>{e('identidad', v)}</Badge>;
}
export function PagoPill({ v }: { v: EstadoPago }) {
  const { e } = useT();
  return <Badge tone={pagoTone[v]} dot>{e('pago', v)}</Badge>;
}
export const ORIGEN_COLOR: Record<Origen, string> = {
  fullday: 'var(--accent)',
  airbnb: 'var(--airbnb)',
  booking: 'var(--booking)',
  bloqueo: 'var(--muted)',
};

export function SuperhostBadge({ className, f }: { className?: string; f?: boolean }) {
  const { t } = useT();
  return (
    <span className={cn('pill border border-gold/30 bg-card/95 text-gold shadow-sm backdrop-blur', className)}>
      <Award size={12} />
      {t(f ? 'common.superhostF' : 'common.superhost')}
    </span>
  );
}

/* ---------- Foto con aspect-ratio fijo y fallback a gradiente ---------- */
export function Photo({ src, alt, className, ratio = '4/3', children }: { src?: string; alt: string; className?: string; ratio?: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('relative overflow-hidden bg-subtle', className)} style={{ aspectRatio: ratio, background: failed || !src ? photoFallback : undefined }}>
      {src && !failed && <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
      {children}
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, size = 32, role, className }: { name: string; size?: number; role?: Role; className?: string }) {
  const initials = name
    .replace(/\(.*\)/, '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const style =
    role === 'admin'
      ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
      : role === 'propietario'
        ? { background: 'color-mix(in srgb, var(--gold) 18%, var(--card))', color: 'var(--gold)', boxShadow: 'inset 0 0 0 1.5px var(--gold)' }
        : role === 'cliente'
          ? { background: 'var(--card)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1.5px var(--accent)' }
          : { background: 'var(--bg-soft)', color: 'var(--text-2)', boxShadow: 'inset 0 0 0 1px var(--border)' };
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', className)} style={{ width: size, height: size, fontSize: size * 0.38, ...style }}>
      {initials}
    </span>
  );
}

/* ---------- Progress ---------- */
export function Progress({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-subtle', className)}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

/* ---------- Segmentado / tabs ---------- */
export function Segmented<T extends string>({ value, onChange, options, className, full }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string; full?: boolean }) {
  return (
    <div className={cn('no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-ctl border border-line bg-subtle p-1', full && 'w-full', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 text-[13px] font-medium transition',
            full && 'flex-1',
            value === o.value ? 'bg-card text-ink shadow-sm' : 'text-ink2 hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('num text-[11px]', value === o.value ? 'text-accent' : 'text-muted')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Switch (Radix) ---------- */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <SwitchPrim.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-subtle transition data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      style={{ margin: '10px 0' }}
    >
      <SwitchPrim.Thumb className="block h-[18px] w-[18px] translate-x-[2px] rounded-full bg-white shadow transition data-[state=checked]:translate-x-[22px]" />
    </SwitchPrim.Root>
  );
}

/* ---------- Preview banner ---------- */
export function PreviewBanner({ bullets }: { bullets: [string, string, string] }) {
  const { t } = useT();
  const key = 'fd_banner_collapsed_' + location.pathname.split('/').slice(0, 3).join('_');
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () => {
    const v = !collapsed;
    setCollapsed(v);
    try {
      sessionStorage.setItem(key, v ? '1' : '0');
    } catch {
      /* noop */
    }
  };
  return (
    <div className="no-print mb-6 rounded-card border border-dashed border-line-strong bg-subtle px-4 py-3" data-tour="preview-banner">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill bg-accent-soft text-accent">{t('banner.preview')}</span>
        <span className="pill border border-line bg-card text-ink2">{t('banner.mock')}</span>
        <span className="text-[13px] font-semibold text-ink">{t('banner.title')}</span>
        <button onClick={toggle} className="ml-auto inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 text-xs font-medium text-muted hover:text-ink" aria-expanded={!collapsed}>
          {collapsed ? t('banner.show') : t('banner.hide')}
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {!collapsed && (
        <ul className="mt-2.5 grid gap-x-6 gap-y-1.5 text-[13px] text-ink2 md:grid-cols-3">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- DevNotice ---------- */
export function DevNotice({ feature, now, later, className, compact }: { feature: string; now: string; later: string; className?: string; compact?: boolean }) {
  const { t } = useT();
  return (
    <div className={cn('no-print flex gap-3 rounded-card border border-warn/30 bg-warn/[0.07] text-[13px]', compact ? 'px-3 py-2.5' : 'mb-4 px-4 py-3', className)}>
      <Wrench size={16} className="mt-0.5 shrink-0 text-warn" />
      <div className="min-w-0">
        <div className="font-semibold text-warn">
          {feature} · {t('dev.inDev')}
        </div>
        <div className="mt-0.5 text-ink2">
          <b className="font-medium text-ink">{t('dev.now')}</b> {now} <b className="ml-1 font-medium text-ink">{t('dev.later')}</b> {later}
        </div>
      </div>
    </div>
  );
}

/* ---------- ⓘ En desarrollo ---------- */
export function InfoDev({ text, label }: { text: string; label?: string }) {
  const { t } = useT();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full px-2 text-xs font-medium text-muted hover:bg-subtle hover:text-ink">
          <Info size={15} />
          {label ?? t('dev.badge')}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} className="z-[90] max-w-[min(280px,calc(100vw-32px))] rounded-ctl border border-line bg-card px-3 py-2 text-[13px] text-ink2 shadow-md">
          {text}
          <Popover.Arrow className="fill-[var(--card)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ---------- Menú ⋯ de fila (sin hover) ---------- */
export function RowMenu({ items, label = '⋯' }: { items: { label: string; onClick: () => void; danger?: boolean; icon?: ReactNode }[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" onClick={(e) => e.stopPropagation()} className="icon-btn" aria-label={label}>
          <MoreHorizontal size={18} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="end" className="z-[90] w-56 rounded-ctl border border-line bg-card p-1 shadow-md" onClick={(e) => e.stopPropagation()}>
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={cn('flex min-h-[44px] w-full items-center gap-2 rounded-[8px] px-3 text-left text-sm hover:bg-subtle', it.danger ? 'text-danger' : 'text-ink')}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ---------- Contenedor de gráfico con alto explícito ---------- */
export function ChartCard({ title, subtitle, children, height = 260, actions, className, dataTrailer }: { title: string; subtitle?: string; children: ReactNode; height?: number; actions?: ReactNode; className?: string; dataTrailer?: string }) {
  return (
    <div className={cn('card min-w-0 p-4 sm:p-5', className)} data-trailer={dataTrailer}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="section-title">{title}</div>
          {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
        </div>
        {actions}
      </div>
      <div style={{ height }} className="w-full min-w-0">
        {children}
      </div>
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className, bodyClass, dataTour, dataTrailer }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; dataTour?: string; dataTrailer?: string }) {
  return (
    <section className={cn('card min-w-0', className)} data-tour={dataTour} data-trailer={dataTrailer}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <div className="section-title">{title}</div>}
            {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', bodyClass)}>{children}</div>
    </section>
  );
}

/* ---------- Estado vacío ---------- */
export function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
      {icon}
      {text}
    </div>
  );
}

/* ---------- Barra fija inferior (mobile) que registra su alto en --view-bar-h ---------- */
export function FixedBottomBar({ children, className, dataTour }: { children: ReactNode; className?: string; dataTour?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const visible = getComputedStyle(el).display !== 'none';
      document.documentElement.style.setProperty('--view-bar-h', visible ? `${el.offsetHeight}px` : '0px');
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      document.documentElement.style.setProperty('--view-bar-h', '0px');
    };
  }, []);
  return (
    <div
      ref={ref}
      data-no-print
      data-tour={dataTour}
      className={cn('fixed inset-x-0 z-40 flex items-center gap-3 border-t border-line bg-[color-mix(in_srgb,var(--bg)_95%,transparent)] px-4 py-3 backdrop-blur lg:hidden', className)}
      style={{ bottom: 'var(--bottom-nav-h, 0px)' }}
    >
      {children}
    </div>
  );
}

/* ---------- Tooltip Recharts limpio ---------- */
export const chartTooltipStyle = {
  contentStyle: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-md)',
    fontSize: 12,
    color: 'var(--text)',
  },
  labelStyle: { color: 'var(--text-2)', fontWeight: 600 },
  itemStyle: { color: 'var(--text)' },
  cursor: { fill: 'var(--bg-soft)' },
};
export const axisProps = {
  tick: { fill: 'var(--muted)', fontSize: 11 },
  axisLine: false,
  tickLine: false,
};

/* ---------- Hook media query ---------- */
export function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}
