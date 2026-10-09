import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarRange,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  ScanFace,
  MessageCircle,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  Compass,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '@/store';
import { tr, useT } from '@/i18n';
import { cn, WHATSAPP_URL } from '@/lib/utils';
import { fmtUSD } from '@/lib/format';
import type { Bi, Role } from '@/types';

interface Mod {
  n: number;
  icon: LucideIcon;
  view: string;
  role: Role;
}

const MODS: Mod[] = [
  { n: 1, icon: Users, view: '/admin/usuarios', role: 'admin' },
  { n: 2, icon: Search, view: '/explorar', role: 'cliente' },
  { n: 3, icon: ScanFace, view: '/reservar/casa-del-olivar', role: 'cliente' },
  { n: 4, icon: CalendarRange, view: '/propietario/calendario', role: 'propietario' },
  { n: 5, icon: CreditCard, view: '/admin/pagos', role: 'admin' },
  { n: 6, icon: Bell, view: '/propietario/notificaciones', role: 'propietario' },
  { n: 7, icon: BarChart3, view: '/admin/metricas', role: 'admin' },
];

const CIRCUIT: { icon: LucideIcon; hl?: boolean }[] = [{ icon: Compass }, { icon: ScanFace }, { icon: Wallet }, { icon: CalendarRange, hl: true }, { icon: BarChart3 }];

const TOTAL = 6000;
const BULLETS: Record<number, number> = { 1: 5, 2: 6, 3: 5, 4: 5, 5: 4, 6: 5, 7: 4 };

function SectionHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-[22px]">{title}</h2>
        {sub && <p className="mt-1 text-sm text-ink2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Row({ label, sub, value, strong }: { label: string; sub?: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-2.5 text-sm">
      <span className="min-w-0">
        <span className={cn('block', strong ? 'font-semibold text-ink' : 'text-ink')}>{label}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
      <span className="mb-1 min-w-4 flex-1 border-b border-dotted border-line-strong" />
      <span className="num shrink-0 text-ink">{value}</span>
    </div>
  );
}

function Investment() {
  const { t } = useT();
  const [open, setOpen] = useState(false); // nunca se persiste: cada carga arranca oculto
  const disc = TOTAL * 0.85;
  return (
    <section className={cn('card overflow-hidden', !open && 'print:hidden')} data-tour="investment">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="kpi-label">{t('prop.invLabel')}</div>
          {!open ? (
            <>
              <div className="num mt-2 text-[32px] font-bold tracking-[0.2em] text-ink">••••••</div>
              <div className="mt-1 text-xs text-muted">{t('prop.invHint')}</div>
            </>
          ) : (
            <div className="mt-1 text-sm text-ink2">{t('prop.invOnce')}</div>
          )}
        </div>
        <button onClick={() => setOpen(!open)} className={cn('min-h-[48px] w-full sm:w-auto', open ? 'btn-secondary' : 'btn-primary')} data-no-print aria-expanded={open}>
          {open ? <EyeOff size={18} /> : <Eye size={18} />}
          {open ? t('prop.invHide') : t('prop.invShow')}
        </button>
      </div>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden">
          <div className="border-t border-line p-5 sm:p-6">
            <div className="num break-words font-bold leading-none text-ink" style={{ fontSize: 'clamp(40px, 8vw, 56px)' }}>
              {fmtUSD(TOTAL)}
            </div>
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <div>
                <div className="kpi-label mb-1">{t('prop.breakdown')}</div>
                <Row label={t('prop.invLine')} value={fmtUSD(TOTAL)} strong />
                <div className="kpi-label mb-1 mt-6">{t('prop.payTitle')}</div>
                <Row label={t('prop.pay1')} sub={t('prop.pay1d')} value={fmtUSD(3000)} />
                <Row label={t('prop.pay2')} sub={t('prop.pay2d')} value={fmtUSD(1500)} />
                <Row label={t('prop.pay3')} sub={t('prop.pay3d')} value={fmtUSD(1500)} />
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-card border-2 border-accent bg-accent-soft p-4 sm:p-5">
                  <div className="text-sm font-semibold text-ink">{t('prop.discTitle')}</div>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="num text-base text-muted line-through">{fmtUSD(TOTAL)}</span>
                    <span className="num text-[28px] font-bold text-accent">{fmtUSD(disc)}</span>
                  </div>
                  <span className="pill mt-2 bg-ok/10 text-ok">{t('prop.discSave', { amount: fmtUSD(TOTAL - disc) })}</span>
                </div>
                <div className="flex items-start gap-2.5 rounded-ctl bg-subtle px-4 py-3 text-sm leading-relaxed text-ink">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ok" />
                  {t('prop.terms')}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}

export default function Propuesta() {
  const { t } = useT();
  const navigate = useNavigate();
  const destacado = useApp((s) => s.moduloDestacado);
  const refs = useRef<Record<number, HTMLDivElement | null>>({});
  const [glow, setGlow] = useState<number | null>(null);

  // Retorno desde "Ver en el demo": centrar y resaltar la tarjeta de origen ~4s
  useEffect(() => {
    if (destacado === null) return;
    const n = destacado;
    const t1 = setTimeout(() => {
      refs.current[n]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setGlow(n);
    }, 120);
    const t2 = setTimeout(() => setGlow(null), 4000);
    const t3 = setTimeout(() => useApp.getState().limpiarDestacado(), 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [destacado]);

  const openPreview = useCallback(
    (m: Mod) => {
      const s = useApp.getState();
      const titulo: Bi = [tr(`prop.m${m.n}t`, 'es'), tr(`prop.m${m.n}t`, 'en')];
      const needsRole = s.role !== m.role;
      s.abrirPreview(m.n, m.view, m.role, titulo);
      setTimeout(() => navigate(m.view), needsRole ? 90 : 0);
    },
    [navigate],
  );

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* 1) Encabezado */}
      <header className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <span className="pill border border-accent/25 bg-accent-soft text-accent">
            <FileText size={12} />
            {t('prop.badge')}
          </span>
          <h1 className="mt-4 text-[30px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[40px]">{t('prop.title')}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink2 sm:text-base">{t('prop.sub')}</p>
          <p className="mt-2 text-xs text-muted">{t('prop.forLine')}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto" data-no-print>
          <button className="btn-secondary w-full sm:w-auto" onClick={() => window.print()}>
            <Printer size={16} />
            {t('prop.print')}
          </button>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="btn-primary w-full sm:w-auto">
            <MessageCircle size={16} />
            {t('prop.whatsapp')}
          </a>
        </div>
      </header>

      {/* 2) El circuito */}
      <section className="mb-12" data-trailer="circuito">
        <SectionHead title={t('prop.circuitTitle')} sub={t('prop.circuitSub')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CIRCUIT.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className={cn('relative flex flex-col rounded-card border p-4', c.hl ? 'border-accent bg-accent-soft shadow-md ring-1 ring-accent/30' : 'border-line bg-card shadow-sm', i === 4 && 'sm:col-span-2 lg:col-span-1')}>
                <div className="flex items-center justify-between">
                  <span className={cn('text-[10.5px] font-bold uppercase tracking-[0.14em]', c.hl ? 'text-accent' : 'text-muted')}>{t('prop.step', { n: i + 1 })}</span>
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', c.hl ? 'bg-accent text-accent-fg' : 'bg-subtle text-ink2')}>
                    <Icon size={16} />
                  </span>
                </div>
                <div className="mt-3 text-[15px] font-semibold leading-snug text-ink">{t(`prop.c${i + 1}t`)}</div>
                <div className="mt-1 text-[13px] leading-relaxed text-ink2">{t(`prop.c${i + 1}d`)}</div>
                {c.hl && <span className="pill mt-3 w-fit bg-accent text-accent-fg">{t('prop.c4tag')}</span>}
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <RefreshCw size={14} className="shrink-0" />
          {t('prop.loop')}
        </p>
      </section>

      {/* 3) Módulos */}
      <section className="mb-12" data-trailer="modulos">
        <SectionHead
          title={t('prop.modsTitle')}
          sub={t('prop.modsSub')}
          right={
            <span className="pill shrink-0 border border-line bg-subtle text-ink">
              <span className="num">{t('prop.modsCount')}</span>
            </span>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODS.map((m) => {
            const Icon = m.icon;
            const hl = glow === m.n;
            return (
              <div
                key={m.n}
                ref={(el) => {
                  refs.current[m.n] = el;
                }}
                className={cn('flex flex-col rounded-card border bg-card p-5 shadow-sm transition-all duration-500', hl ? 'border-accent shadow-md ring-4 ring-accent/25 [translate:0_-4px]' : 'border-line')}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="num text-[13px] text-muted">{String(m.n).padStart(2, '0')}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Icon size={17} />
                  </span>
                </div>
                <h3 className="mt-3 text-[13px] font-bold uppercase tracking-[0.08em] text-ink">{t(`prop.m${m.n}t`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink2">{t(`prop.m${m.n}d`)}</p>
                <ul className="mt-4 space-y-2">
                  {Array.from({ length: BULLETS[m.n] }, (_, k) => k + 1).map((i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-ink">
                      <Check size={15} strokeWidth={2.6} className="mt-px shrink-0 text-accent" />
                      {t(`prop.m${m.n}b${i}`)}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5">
                  <button onClick={() => openPreview(m)} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-accent hover:underline" data-no-print data-tour={`see-demo-${m.n}`}>
                    {t('prop.seeDemo')}
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="flex items-center rounded-card border border-dashed border-line-strong bg-subtle p-5 text-[13px] leading-relaxed text-ink2">{t('prop.onboard')}</div>
        </div>
      </section>

      {/* 4) Inversión — siempre al final, oculta por defecto */}
      <section className="mb-12">
        <SectionHead title={t('prop.invTitle')} />
        <Investment />
      </section>

      {/* 5) Cierre */}
      <section className="rounded-panel border border-accent/30 bg-accent-soft px-6 py-10 text-center sm:px-10" data-no-print>
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t('prop.closeTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-ink2">{t('prop.closeSub')}</p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="btn-primary mt-6 w-full">
          <MessageCircle size={16} />
          {t('prop.whatsapp')}
        </a>
        <div className="mt-5 text-[10px] uppercase tracking-[0.14em] text-muted">Powered by Insights</div>
      </section>
    </div>
  );
}
