import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, Award, CalendarCheck, CheckCircle2, ChevronRight, CreditCard, Home, Percent, RefreshCw, ScanFace, Star, Wallet } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useApp, TODAY } from '@/store';
import { useT } from '@/i18n';
import { greetingKey } from '@/layout/useNavActions';
import { metrics, occupancy, pctDelta, periodOf, revenueByMonth, upcomingCheckins } from '@/data/selectors';
import { propById } from '@/data/properties';
import { fmtARS, fmtARSShort, fmtDate, fmtDayLong, fmtMinAgo, iso, nights } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, ChartCard, Empty, IdentidadPill, KpiCard, OrigenPill, PageHeader, PreviewBanner, axisProps, chartTooltipStyle, useMedia } from '@/components/ui';

export default function AdminPanel() {
  const { t, x, lang } = useT();
  const navigate = useNavigate();
  const reservas = useApp((s) => s.reservas);
  const pagos = useApp((s) => s.pagos);
  const propiedades = useApp((s) => s.propiedades);
  const wide = useMedia('(min-width: 640px)');

  const kpi = useMemo(() => {
    const cur = metrics(reservas, periodOf('month'));
    const prev = metrics(reservas, periodOf('prev'));
    const today = iso(TODAY);
    const activas = reservas.filter((r) => (r.estado === 'confirmada' || r.estado === 'pendiente') && r.origen !== 'bloqueo' && r.checkOut >= today);
    const homes = propiedades.filter((p) => p.tipo === 'alojamiento');
    return {
      revenue: cur.revenue,
      delta: pctDelta(cur.revenue, prev.revenue),
      count: cur.count,
      activas: activas.length,
      pendientes: activas.filter((r) => r.estado === 'pendiente').length,
      occ: occupancy(reservas, periodOf('month')),
      occPrev: occupancy(reservas, periodOf('prev')),
      homesActive: homes.filter((p) => p.activa).length,
      homesTotal: homes.length,
      homesSuper: homes.filter((p) => p.superanfitrion).length,
    };
  }, [reservas, propiedades]);

  const chart = useMemo(
    () => revenueByMonth(reservas, 6).map((m) => ({ label: fmtDate(m.month, 'MMM', lang), revenue: m.revenue, count: m.count })),
    [reservas, lang],
  );

  const checkins = useMemo(() => upcomingCheckins(reservas, 7), [reservas]);

  /* ---------- Requiere atención: calculado desde el store ---------- */
  const tipas = propiedades.find((p) => p.id === 'p-tipas');
  const fd1043 = reservas.find((r) => r.id === 'FD-1043');
  const mp = pagos.find((p) => p.id === 'MP-88213');
  const attention: { key: string; icon: typeof AlertTriangle; tone: 'danger' | 'warn'; title: string; text: string; cta: string; to: string }[] = [];
  if (tipas?.feeds.booking?.estado === 'error')
    attention.push({
      key: 'sync',
      icon: RefreshCw,
      tone: 'danger',
      title: tipas.nombre,
      text: x('Error de sincronización con Booking {ago}', 'Booking sync error {ago}', { ago: fmtMinAgo(tipas.feeds.booking.ultimaSyncMin, lang) }),
      cta: x('Ver calendarios', 'Open calendars'),
      to: '/admin/calendarios',
    });
  if (fd1043 && fd1043.identidad === 'revision' && fd1043.estado !== 'cancelada') {
    const d = differenceInCalendarDays(parseISO(fd1043.checkIn), TODAY);
    attention.push({
      key: 'id',
      icon: ScanFace,
      tone: 'warn',
      title: `${fd1043.id} · ${fd1043.huespedNombre}`,
      text: x('Identidad en revisión · check-in en {n} días', 'Identity under review · check-in in {n} days', { n: d }),
      cta: x('Revisar documento', 'Review ID'),
      to: `/admin/reservas/${fd1043.id}`,
    });
  }
  if (mp && mp.estado === 'pendiente')
    attention.push({
      key: 'pago',
      icon: CreditCard,
      tone: 'warn',
      title: `${mp.id} · ${fmtARS(mp.monto, lang)}`,
      text: x('Pago pendiente · expira en {h} h', 'Pending payment · expires in {h} h', { h: mp.expiraHoras ?? 6 }),
      cta: x('Ver pagos', 'Open payments'),
      to: '/admin/pagos',
    });

  const all = propiedades;
  const destacados = all.filter((p) => p.destacado);
  const superAuto = all.filter((p) => p.superanfitrion && p.superSource === 'auto').length;
  const superManual = all.filter((p) => p.superanfitrion && p.superSource === 'manual').length;

  const delta = kpi.delta;
  const occDelta = kpi.occ - kpi.occPrev;

  return (
    <div className="fade-up">
      <PageHeader
        title={`${t(greetingKey())}, Javier`}
        subtitle={x(
          'Así viene Full Day hoy, {date}. Todo lo que ves se calcula en vivo desde las reservas, pagos y calendarios.',
          'Here’s how Full Day looks today, {date}. Everything you see is computed live from bookings, payments and calendars.',
          { date: fmtDayLong(TODAY, lang) },
        )}
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate('/admin/metricas')}>
              {x('Ver métricas', 'See metrics')}
            </button>
            <button className="btn-primary" onClick={() => navigate('/admin/reservas')}>
              {x('Ir a reservas', 'Go to bookings')}
              <ArrowRight size={16} />
            </button>
          </>
        }
      />
      <PreviewBanner
        bullets={[
          x('Resume en una pantalla la facturación, ocupación y reservas de todas las casas.', 'Summarizes revenue, occupancy and bookings for every home on one screen.'),
          x('Te avisa lo que necesita acción: errores de sincronización, identidades y pagos por vencer.', 'Flags what needs action: sync errors, ID checks and payments about to expire.'),
          x('Los números salen de la base real en tiempo real, sin planillas.', 'Numbers come straight from the live database, no spreadsheets.'),
        ]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4" data-tour="admin-kpis">
        <KpiCard
          label={x('Facturación del mes', 'Revenue this month')}
          value={fmtARSShort(kpi.revenue, lang)}
          delta={`${delta >= 0 ? '+' : ''}${delta}%`}
          deltaDir={delta >= 0 ? 'up' : 'down'}
          hint={x('{n} reservas · vs. mes anterior', '{n} bookings · vs. last month', { n: kpi.count })}
          icon={<Wallet size={16} />}
          onClick={() => navigate('/admin/metricas')}
        />
        <KpiCard
          label={x('Reservas activas', 'Active bookings')}
          value={kpi.activas}
          hint={x('{n} pendientes de pago', '{n} awaiting payment', { n: kpi.pendientes })}
          icon={<CalendarCheck size={16} />}
          onClick={() => navigate('/admin/reservas')}
        />
        <KpiCard
          label={x('Ocupación promedio del mes', 'Average occupancy this month')}
          value={`${kpi.occ}%`}
          delta={`${occDelta >= 0 ? '+' : ''}${occDelta} pp`}
          deltaDir={occDelta >= 0 ? 'up' : 'down'}
          hint={x('{n} alojamientos · noches vendidas / disponibles', '{n} homes · nights sold / available', { n: kpi.homesTotal })}
          icon={<Percent size={16} />}
          onClick={() => navigate('/admin/metricas')}
        />
        <KpiCard
          label={x('Propiedades activas', 'Active properties')}
          value={kpi.homesActive}
          hint={x('{a} de {b} Superanfitriones', '{a} of {b} are Superhosts', { a: kpi.homesSuper, b: kpi.homesTotal })}
          icon={<Home size={16} />}
          onClick={() => navigate('/admin/propiedades')}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={x('Facturación · últimos 6 meses', 'Revenue · last 6 months')}
          subtitle={x('Reservas de Full Day, Airbnb y Booking (sin canceladas)', 'Full Day, Airbnb and Booking bookings (excluding cancelled)')}
          height={wide ? 280 : 220}
          actions={<span className="num text-sm text-ink">{fmtARSShort(chart.reduce((a, c) => a + c.revenue, 0), lang)}</span>}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" {...axisProps} tickFormatter={(v: string) => v.replace('.', '')} />
              <YAxis {...axisProps} width={52} tickFormatter={(v: number) => fmtARSShort(v, lang).replace('ARS ', '')} />
              <Tooltip
                {...chartTooltipStyle}
                cursor={{ stroke: 'var(--border-strong)' }}
                formatter={(v) => [fmtARS(Number(v), lang), x('Facturación', 'Revenue')]}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: 'var(--card)', stroke: 'var(--accent)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card
          title={
            <span className="flex items-center gap-2">
              {x('Requiere atención', 'Needs attention')}
              {attention.length > 0 && <span className="num rounded-full bg-danger/10 px-2 text-xs text-danger">{attention.length}</span>}
            </span>
          }
          bodyClass="p-2 sm:p-2"
          dataTour="admin-attention"
        >
          {attention.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <CheckCircle2 className="text-ok" size={28} />
              <div className="text-sm font-semibold text-ink">{x('Todo en orden', 'All clear')}</div>
              <div className="text-xs text-muted">{x('No hay alertas pendientes.', 'No pending alerts.')}</div>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((a) => (
                <li key={a.key}>
                  <button onClick={() => navigate(a.to)} className="group flex w-full items-start gap-3 rounded-ctl px-3 py-3 text-left transition hover:bg-subtle">
                    <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', a.tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn')}>
                      <a.icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{a.title}</span>
                      <span className="block text-[13px] text-ink2">{a.text}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                        {a.cta}
                        <ChevronRight size={13} className="transition group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title={x('Próximos check-ins (7 días)', 'Upcoming check-ins (7 days)')}
          subtitle={x('{n} llegadas en todas las casas y experiencias', '{n} arrivals across all homes and experiences', { n: checkins.length })}
          actions={
            <button className="btn-ghost btn-sm" onClick={() => navigate('/admin/reservas')}>
              {x('Ver todas', 'See all')}
              <ChevronRight size={14} />
            </button>
          }
          bodyClass="p-2 sm:p-2"
        >
          {checkins.length === 0 ? (
            <Empty text={x('No hay check-ins en los próximos 7 días.', 'No check-ins in the next 7 days.')} />
          ) : (
            <ul className="divide-y divide-line">
              {checkins.slice(0, 8).map((r) => {
                const p = propById(r.propiedadId);
                const d = differenceInCalendarDays(parseISO(r.checkIn), TODAY);
                return (
                  <li key={r.id}>
                    <button onClick={() => navigate(`/admin/reservas/${r.id}`)} className="flex w-full items-center gap-3 rounded-ctl px-3 py-3 text-left transition hover:bg-subtle">
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-ctl border border-line bg-subtle py-1.5">
                        <span className="text-[10px] font-semibold uppercase text-muted">{fmtDate(r.checkIn, 'EEE', lang).replace('.', '')}</span>
                        <span className="num text-base leading-tight text-ink">{fmtDate(r.checkIn, 'd', lang)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{r.huespedNombre}</div>
                        <div className="truncate text-xs text-ink2">
                          {p.nombre} ·{' '}
                          {p.tipo === 'experiencia'
                            ? x('{n} personas', '{n} people', { n: r.huespedes })
                            : t('common.nights', { n: nights(r.checkIn, r.checkOut) })}{' '}
                          · {d === 0 ? x('hoy', 'today') : d === 1 ? x('mañana', 'tomorrow') : x('en {n} días', 'in {n} days', { n: d })}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">
                          <OrigenPill v={r.origen} />
                          <IdentidadPill v={r.identidad} />
                        </div>
                      </div>
                      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                        <IdentidadPill v={r.identidad} />
                        <OrigenPill v={r.origen} />
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title={x('Destacados y Superanfitriones', 'Featured & Superhosts')}
          actions={
            <button className="btn-ghost btn-sm" onClick={() => navigate('/admin/propiedades')}>
              {x('Gestionar', 'Manage')}
              <ChevronRight size={14} />
            </button>
          }
        >
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={<Star size={14} className="fill-accent text-accent" />} value={destacados.length} label={x('Destacados', 'Featured')} />
            <Stat icon={<Award size={14} className="text-gold" />} value={superAuto} label={x('Auto · Airbnb', 'Auto · Airbnb')} />
            <Stat icon={<Award size={14} className="text-navy" />} value={superManual} label={x('Manual', 'Manual')} />
          </div>
          <p className="mt-4 text-[13px] text-ink2">{x('Los destacados aparecen primero en el catálogo:', 'Featured listings show up first in the catalog:')}</p>
          <ul className="mt-2 space-y-1.5">
            {destacados.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <Star size={13} className="shrink-0 fill-accent text-accent" />
                <span className="min-w-0 flex-1 truncate text-ink">{p.nombre}</span>
                <span className="num text-xs text-muted">{p.airbnbRating.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US')} ★</span>
              </li>
            ))}
            {destacados.length === 0 && <li className="text-xs text-muted">{x('Ningún anuncio destacado.', 'No featured listings.')}</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-ctl border border-line bg-subtle px-2 py-3 text-center">
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <span className="num text-xl text-ink">{value}</span>
      </div>
      <div className="mt-1 text-[11px] leading-tight text-ink2">{label}</div>
    </div>
  );
}
