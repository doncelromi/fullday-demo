import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ArrowRight, Bell, CalendarDays, Lock, MessageCircle, Star } from 'lucide-react';
import { ChartCard, KpiCard, OrigenPill, PageHeader, Photo, PreviewBanner, axisProps, chartTooltipStyle } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { MARIELA_PROPS, activeRes, metrics, notifsFor, occupancy, pctDelta, periodOf, previousPeriod, revenueByMonth, upcomingCheckins } from '@/data/selectors';
import { TODAY } from '@/data/seed';
import { cn } from '@/lib/utils';
import { fmtARS, fmtARSShort, fmtMinAgo, fmtRelative, iso, locale, nights } from '@/lib/format';
import { ReservaPanel } from '@/pages/shared/ReservaDetail';
import { BlockDatesModal } from '@/pages/shared/BlockDatesModal';
import { LiveDot, useSyncMin } from '@/pages/shared/sync';

export default function OwnerPanel() {
  const { t, x, e, b, lang } = useT();
  const navigate = useNavigate();
  const reservas = useApp((s) => s.reservas);
  const propiedades = useApp((s) => s.propiedades);
  const notifs = useApp((s) => s.notifs);
  const marcarLeida = useApp((s) => s.marcarLeida);
  const syncMin = useSyncMin();
  const [panelId, setPanelId] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);

  const mes = useMemo(() => periodOf('mes'), []);
  const cur = useMemo(() => metrics(reservas, mes, MARIELA_PROPS), [reservas, mes]);
  const prev = useMemo(() => metrics(reservas, previousPeriod(mes), MARIELA_PROPS), [reservas, mes]);
  const occ = useMemo(() => occupancy(reservas, mes, MARIELA_PROPS), [reservas, mes]);
  const upcomingAll = useMemo(() => reservas.filter((r) => MARIELA_PROPS.includes(r.propiedadId) && activeRes(r) && r.origen !== 'bloqueo' && r.checkIn >= iso(TODAY)), [reservas]);
  const next14 = useMemo(() => upcomingCheckins(reservas, 14, MARIELA_PROPS), [reservas]);
  const props = MARIELA_PROPS.map((id) => propiedades.find((p) => p.id === id)!);
  const rating = props.reduce((a, p) => a + p.rating, 0) / props.length;
  const reviews = props.reduce((a, p) => a + p.resenas, 0);
  const last5 = useMemo(() => notifsFor(notifs, 'propietario').sort((a, c) => c.fecha.localeCompare(a.fecha)).slice(0, 5), [notifs]);
  const series = useMemo(() => revenueByMonth(reservas, 6, MARIELA_PROPS).map((m) => ({ ...m, label: format(m.month, 'MMM', { locale: locale(lang) }) })), [reservas, lang]);
  const dRev = pctDelta(cur.revenue, prev.revenue);
  const h = new Date().getHours();
  const greet = t(h < 12 ? 'greet.morning' : h < 20 ? 'greet.afternoon' : 'greet.evening');
  const propOf = (id: string) => propiedades.find((p) => p.id === id);

  const when = (d: string) => {
    const n = differenceInCalendarDays(parseISO(d), TODAY);
    if (n === 0) return x('Hoy', 'Today');
    if (n === 1) return x('Mañana', 'Tomorrow');
    return x('En {n} días', 'In {n} days', { n });
  };

  return (
    <>
      <PageHeader
        title={`${greet}, Mariela`}
        subtitle={x('Así vienen Casa del Olivar, Cabaña Los Álamos y Loft Viamonte hoy.', 'Here’s how Casa del Olivar, Cabaña Los Álamos and Loft Viamonte are doing today.')}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setBlockOpen(true)}>
              <Lock size={16} />
              {x('Bloquear fechas', 'Block dates')}
            </button>
            <Link to="/propietario/calendario" className="btn-primary">
              <CalendarDays size={16} />
              {x('Ver calendario', 'View calendar')}
            </Link>
          </>
        }
      />
      <PreviewBanner
        bullets={[
          x('Mariela ve solo sus 3 casas: facturación, ocupación y próximos check-ins de un vistazo.', 'Mariela only sees her 3 homes: revenue, occupancy and upcoming check-ins at a glance.'),
          x('El estado de sincronización con Airbnb y Booking está siempre visible.', 'Airbnb and Booking sync status is always visible.'),
          x('Cada aviso que le llega por WhatsApp también queda acá.', 'Every alert she gets on WhatsApp is also kept here.'),
        ]}
      />

      {/* Estado de sincronización */}
      <Link to="/propietario/calendario" className="card mb-4 flex min-h-[52px] items-center gap-3 px-4 py-3 transition hover:border-line-strong">
        <LiveDot />
        <span className="min-w-0 flex-1 text-sm text-ink2">
          <span className="font-semibold text-airbnb">Airbnb ✓</span>
          <span className="mx-1.5 text-muted">·</span>
          <span className="font-semibold text-booking">Booking ✓</span>
          <span className="mx-1.5 text-muted">·</span>
          {x('sincronizado {t}', 'synced {t}', { t: fmtMinAgo(syncMin, lang) })}
        </span>
        <span className="hidden shrink-0 text-xs font-semibold text-accent sm:inline">{x('Abrir calendario', 'Open calendar')}</span>
        <ArrowRight size={16} className="shrink-0 text-accent" />
      </Link>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={x('Facturación del mes', 'Revenue this month')}
          value={fmtARS(cur.revenue, lang)}
          delta={`${dRev > 0 ? '+' : ''}${dRev}%`}
          deltaDir={dRev < 0 ? 'down' : 'up'}
          hint={x('vs {v} el mes pasado', 'vs {v} last month', { v: fmtARSShort(prev.revenue, lang) })}
          onClick={() => navigate('/propietario/metricas')}
        />
        <KpiCard label={x('Reservas próximas', 'Upcoming bookings')} value={upcomingAll.length} hint={x('{n} check-ins en los próximos 14 días', '{n} check-ins in the next 14 days', { n: next14.length })} onClick={() => navigate('/propietario/reservas')} />
        <KpiCard label={x('Ocupación del mes', 'Occupancy this month')} value={`${occ}%`} hint={x('Noches ocupadas de tus 3 casas', 'Booked nights across your 3 homes')} onClick={() => navigate('/propietario/calendario')} />
        <KpiCard
          label={x('Nota promedio', 'Average rating')}
          value={
            <span className="inline-flex items-center gap-1.5">
              {rating.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
              <Star size={20} className="fill-gold text-gold" />
            </span>
          }
          hint={x('{n} reseñas · Superanfitriona desde 2017', '{n} reviews · Superhost since 2017', { n: reviews })}
          onClick={() => navigate('/propietario/propiedades')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className="card min-w-0">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
              <div>
                <div className="section-title">{x('Próximos check-ins', 'Upcoming check-ins')}</div>
                <div className="text-xs text-muted">{x('Próximos 14 días', 'Next 14 days')}</div>
              </div>
              <Link to="/propietario/reservas" className="btn-ghost btn-sm">
                {x('Ver todas', 'See all')}
              </Link>
            </div>
            {next14.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">{x('No hay check-ins en los próximos 14 días.', 'No check-ins in the next 14 days.')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {next14.map((r) => {
                  const p = propOf(r.propiedadId);
                  const d = parseISO(r.checkIn);
                  const soon = differenceInCalendarDays(d, TODAY) <= 1;
                  return (
                    <li key={r.id}>
                      <button onClick={() => setPanelId(r.id)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-subtle sm:px-5', r.nueva && 'bg-accent-soft/50')}>
                        <span className={cn('flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-ctl border', soon ? 'border-accent/40 bg-accent-soft text-accent' : 'border-line bg-subtle text-ink')}>
                          <span className="num text-lg leading-none">{d.getDate()}</span>
                          <span className="text-[10px] font-semibold uppercase">{format(d, 'MMM', { locale: locale(lang) }).replace('.', '')}</span>
                        </span>
                        <Photo src={p?.fotos[0]} alt={p?.nombre ?? ''} ratio="1/1" className="hidden w-12 shrink-0 rounded-ctl sm:block" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{r.huespedNombre}</span>
                          <span className="block truncate text-xs text-ink2">
                            {p?.nombre} · {x('{n} noches', '{n} nights', { n: nights(r.checkIn, r.checkOut) })} · {x('{n} huésp.', '{n} guests', { n: r.huespedes })}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <OrigenPill v={r.origen} />
                          <span className={cn('text-[11px] font-medium', soon ? 'text-accent' : 'text-muted')}>{when(r.checkIn)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <ChartCard title={x('Facturación · últimos 6 meses', 'Revenue · last 6 months')} subtitle={x('Tus 3 casas, todos los canales', 'Your 3 homes, all channels')} height={200}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ownerRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={54} tickFormatter={(v: number) => fmtARSShort(v, lang)} />
                <Tooltip {...chartTooltipStyle} cursor={{ stroke: 'var(--border-strong)' }} formatter={(v: number) => [fmtARS(v, lang), x('Facturación', 'Revenue')]} />
                <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2.2} fill="url(#ownerRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <section className="card min-w-0 self-start">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div className="section-title">{x('Últimas notificaciones', 'Latest notifications')}</div>
            <Link to="/propietario/notificaciones" className="btn-ghost btn-sm">
              {x('Ver todas', 'See all')}
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {last5.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    marcarLeida(n.id);
                    navigate('/propietario/notificaciones');
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-subtle sm:px-5"
                >
                  <span className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.canal === 'whatsapp' ? 'bg-[#25d366]/15 text-[#128c7e]' : 'bg-subtle text-ink2')}>
                    {n.canal === 'whatsapp' ? <MessageCircle size={15} /> : <Bell size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-[13px]', n.leida ? 'font-medium text-ink2' : 'font-semibold text-ink')}>{e('plantilla', n.plantilla)}</span>
                      {!n.leida && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    </span>
                    <span className="line-clamp-2 block text-xs text-ink2">{b(n.texto)}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{fmtRelative(n.fecha, lang)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ReservaPanel id={panelId} onClose={() => setPanelId(null)} scope="propietario" />
      <BlockDatesModal open={blockOpen} onClose={() => setBlockOpen(false)} />
    </>
  );
}
