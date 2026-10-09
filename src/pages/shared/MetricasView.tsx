import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker, type DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarRange, Download, Trophy } from 'lucide-react';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { Badge, Card, ChartCard, KpiCard, ORIGEN_COLOR, PageHeader, Photo, PreviewBanner, Progress, Segmented, axisProps, chartTooltipStyle, useMedia } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { MARIELA_PROPS, byProperty, metrics, occupancy, occupancyByProp, originMix, pctDelta, periodOf, previousPeriod, top5, type Period } from '@/data/selectors';
import { PROPIEDADES } from '@/data/properties';
import { TODAY } from '@/data/seed';
import { cn, downloadText } from '@/lib/utils';
import { fmtARS, fmtARSShort, fmtDay, fmtNum, iso, locale } from '@/lib/format';
import type { Origen } from '@/types';
import type { Scope } from './ReservaDetail';

type PKey = 'mes' | 'prev' | '3m' | '12m' | 'custom';

const short = (s: string, n = 15) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function MetricasView({ scope }: { scope: Scope }) {
  const { x, e, lang } = useT();
  const reservas = useApp((s) => s.reservas);
  const propiedades = useApp((s) => s.propiedades);
  const toast = useApp((s) => s.toast);
  const isMobile = useMedia('(max-width: 639px)');

  const [key, setKey] = useState<PKey>('mes');
  const [custom, setCustom] = useState<Period>({ from: addDays(TODAY, -29), to: TODAY });
  const [draft, setDraft] = useState<DateRange | undefined>();
  const [pop, setPop] = useState(false);

  const ids = useMemo(() => (scope === 'admin' ? PROPIEDADES.map((p) => p.id) : MARIELA_PROPS), [scope]);
  const period = useMemo(() => periodOf(key, custom), [key, custom]);
  const prevP = useMemo(() => previousPeriod(period), [period]);

  const cur = useMemo(() => metrics(reservas, period, ids), [reservas, period, ids]);
  const prev = useMemo(() => metrics(reservas, prevP, ids), [reservas, prevP, ids]);
  const bars = useMemo(() => byProperty(reservas, period, ids), [reservas, period, ids]);
  const top = useMemo(() => top5(reservas, period, ids), [reservas, period, ids]);
  const mix = useMemo(() => originMix(reservas, period, ids), [reservas, period, ids]);
  const monthP = useMemo(() => periodOf('mes'), []);
  const occ = useMemo(() => {
    const m = occupancyByProp(reservas, monthP);
    return ids.map((id) => ({ id, v: m[id] ?? 0 })).sort((a, b) => b.v - a.v);
  }, [reservas, monthP, ids]);
  const occAvg = useMemo(() => occupancy(reservas, monthP, ids), [reservas, monthP, ids]);
  const lowest = occ[occ.length - 1];

  const dRev = pctDelta(cur.revenue, prev.revenue);
  const dTicket = pctDelta(cur.ticket, prev.ticket);
  const dNights = pctDelta(cur.nightsSold, prev.nightsSold);
  const sign = (n: number) => (n > 0 ? `+${n}%` : `${n}%`);

  const fmtP = (p: Period) => (key === '12m' || key === '3m' ? `${format(p.from, 'MMM yyyy', { locale: locale(lang) })} → ${format(p.to, 'MMM yyyy', { locale: locale(lang) })}` : `${fmtDay(p.from, lang)} → ${fmtDay(p.to, lang)}`);
  const periodLabel: Record<PKey, string> = {
    mes: x('Este mes', 'This month'),
    prev: x('Mes anterior', 'Last month'),
    '3m': x('3 meses', '3 months'),
    '12m': x('12 meses', '12 months'),
    custom: x('Personalizado', 'Custom'),
  };

  const onPeriod = (v: PKey) => {
    if (v === 'custom') {
      setDraft({ from: custom.from, to: custom.to });
      setPop(true);
    }
    setKey(v);
  };
  const applyCustom = () => {
    if (!draft?.from) return;
    setCustom({ from: draft.from, to: draft.to ?? draft.from });
    setKey('custom');
    setPop(false);
  };

  const exportCsv = () => {
    const tag = key === 'custom' ? `custom-${iso(period.from)}_${iso(period.to)}` : `${key}-${iso(period.from).slice(0, 7)}`;
    const per = `${iso(period.from)} a ${iso(period.to)}`;
    const head = ['propiedad', 'reservas', 'noches', 'facturacion_ars', 'ocupacion_pct', 'periodo'];
    const rows = bars.map((b) => [b.nombre, b.count, b.nights, b.revenue, occupancy(reservas, period, [b.id]), per]);
    rows.push([x('TOTAL', 'TOTAL'), cur.count, cur.nightsSold, cur.revenue, occupancy(reservas, period, ids), per]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadText(`fullday-metricas-${tag}.csv`, csv);
    toast(x('CSV exportado · {n} propiedades · {p}', 'CSV exported · {n} properties · {p}', { n: bars.length, p: periodLabel[key] }));
  };

  const totalMix = mix.reduce((a, m) => a + m.value, 0);
  const maxTop = Math.max(1, ...top.map((t) => t.count));
  const barData = bars.map((b) => ({ ...b, short: short(b.nombre, isMobile ? 18 : 15) }));
  const photoOf = (id: string) => propiedades.find((p) => p.id === id)?.fotos[0];
  const nameOf = (id: string) => propiedades.find((p) => p.id === id)?.nombre ?? id;

  return (
    <>
      <PageHeader
        title={scope === 'admin' ? x('Métricas', 'Metrics') : x('Mis métricas', 'My metrics')}
        subtitle={
          scope === 'admin'
            ? x('Facturación, ocupación y canales de las 14 casas, con comparación contra el período anterior.', 'Revenue, occupancy and channels for all 14 homes, compared against the previous period.')
            : x('Cómo vienen tus 3 casas: facturación, noches vendidas y de dónde llegan las reservas.', 'How your 3 homes are doing: revenue, nights sold and where bookings come from.')
        }
        actions={
          <button className="btn-secondary" onClick={exportCsv}>
            <Download size={16} />
            {x('Exportar CSV', 'Export CSV')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Métricas calculadas en vivo sobre las reservas: cambian si se cancela o entra una reserva.', 'Metrics computed live from bookings: they change when a booking is cancelled or comes in.'),
          x('Período a elección (mes, trimestre, año o rango libre) con comparación automática.', 'Any period (month, quarter, year or custom range) with automatic comparison.'),
          scope === 'admin'
            ? x('Detecta casas con baja ocupación para accionar a tiempo (precio, fotos, promoción).', 'Spots low-occupancy homes so you can act in time (price, photos, promotion).')
            : x('El CSV exporta los números de tus casas para tu contador.', 'The CSV exports your homes’ figures for your accountant.'),
        ]}
      />

      {/* Selector de período */}
      <Popover.Root open={pop} onOpenChange={setPop}>
        <Popover.Anchor asChild>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Segmented
              value={key}
              onChange={onPeriod}
              options={(['mes', 'prev', '3m', '12m', 'custom'] as PKey[]).map((k) => ({ value: k, label: k === 'custom' ? <><CalendarRange size={14} />{periodLabel[k]}</> : periodLabel[k] }))}
            />
            <button
              type="button"
              onClick={() => {
                if (key === 'custom') {
                  setDraft({ from: custom.from, to: custom.to });
                  setPop(true);
                }
              }}
              className={cn('num inline-flex min-h-[40px] items-center rounded-full border border-line px-3 text-xs text-ink2', key === 'custom' && 'border-accent/40 bg-accent-soft text-accent')}
            >
              {fmtP(period)}
            </button>
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={6} collisionPadding={12} className="z-[90] max-w-[calc(100vw-24px)] overflow-x-auto rounded-card border border-line bg-card p-3 shadow-md">
            <DayPicker
              mode="range"
              selected={draft}
              onSelect={setDraft}
              locale={locale(lang)}
              weekStartsOn={1}
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={startOfMonth(addDays(custom.to, isMobile ? 0 : -28))}
              toDate={endOfMonth(addDays(TODAY, 90))}
            />
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-3">
              <span className="num text-xs text-ink2">{draft?.from ? `${fmtDay(draft.from, lang)} → ${draft.to ? fmtDay(draft.to, lang) : '…'}` : x('Elegí inicio y fin', 'Pick start and end')}</span>
              <div className="flex gap-2">
                <button className="btn-ghost btn-sm" onClick={() => setPop(false)}>
                  {x('Cancelar', 'Cancel')}
                </button>
                <button className="btn-primary btn-sm" disabled={!draft?.from} onClick={applyCustom}>
                  {x('Aplicar', 'Apply')}
                </button>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={x('Facturación total', 'Total revenue')} value={fmtARS(cur.revenue, lang)} delta={sign(dRev)} deltaDir={dRev < 0 ? 'down' : 'up'} hint={x('{n} reservas en el período', '{n} bookings in the period', { n: cur.count })} />
        <KpiCard label={x('Ticket promedio por reserva', 'Average ticket per booking')} value={fmtARS(cur.ticket, lang)} delta={sign(dTicket)} deltaDir={dTicket < 0 ? 'down' : 'up'} hint={x('Antes: {v}', 'Before: {v}', { v: fmtARS(prev.ticket, lang) })} />
        <KpiCard label={x('Noches vendidas', 'Nights sold')} value={fmtNum(cur.nightsSold, lang)} delta={sign(dNights)} deltaDir={dNights < 0 ? 'down' : 'up'} hint={x('Antes: {v} noches', 'Before: {v} nights', { v: fmtNum(prev.nightsSold, lang) })} />
        <KpiCard
          label={x('Vs. período anterior', 'Vs. previous period')}
          value={<span className={dRev < 0 ? 'text-danger' : 'text-ok'}>{sign(dRev)}</span>}
          hint={x('{a} vs {b} ({p})', '{a} vs {b} ({p})', { a: fmtARSShort(cur.revenue, lang), b: fmtARSShort(prev.revenue, lang), p: fmtP(prevP) })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Facturación por propiedad */}
        <ChartCard
          className="md:col-span-2"
          title={x('Facturación por propiedad', 'Revenue by property')}
          subtitle={`${periodLabel[key]} · ${fmtP(period)}`}
          height={isMobile ? Math.max(180, barData.length * 34 + 20) : 300}
        >
          <ResponsiveContainer width="100%" height="100%">
            {isMobile ? (
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
                <XAxis type="number" {...axisProps} tickFormatter={(v: number) => fmtARSShort(v, lang)} />
                <YAxis type="category" dataKey="short" {...axisProps} width={112} interval={0} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => [fmtARS(v, lang), x('Facturación', 'Revenue')]} labelFormatter={(_, p) => (p?.[0]?.payload as { nombre?: string } | undefined)?.nombre ?? ''} />
                <Bar dataKey="revenue" fill="var(--accent)" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            ) : (
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="short" {...axisProps} interval={0} angle={barData.length > 5 ? -32 : 0} textAnchor={barData.length > 5 ? 'end' : 'middle'} height={barData.length > 5 ? 74 : 30} />
                <YAxis {...axisProps} width={58} tickFormatter={(v: number) => fmtARSShort(v, lang)} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => [fmtARS(v, lang), x('Facturación', 'Revenue')]} labelFormatter={(_, p) => (p?.[0]?.payload as { nombre?: string } | undefined)?.nombre ?? ''} />
                <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        {/* TOP 5 */}
        <Card
          dataTrailer="top5"
          title={
            <span className="flex items-center gap-2">
              <Trophy size={16} className="text-gold" />
              {x('Top 5 más reservadas', 'Top 5 most booked')}
            </span>
          }
          subtitle={periodLabel[key]}
          bodyClass="p-2 sm:p-3"
        >
          {top.length === 0 || top[0].count === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted">{x('Sin reservas en este período.', 'No bookings in this period.')}</p>
          ) : (
            <ol className="space-y-1">
              {top.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 rounded-ctl px-2 py-2">
                  <span className={cn('num inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]', i === 0 ? 'bg-accent text-accent-fg' : 'bg-subtle text-ink2')}>{i + 1}</span>
                  <Photo src={photoOf(t.id)} alt={t.nombre} ratio="1/1" className="w-11 shrink-0 rounded-[8px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{t.nombre}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${(t.count / maxTop) * 100}%` }} />
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between gap-2 text-xs text-ink2">
                      <span>{x('{n} reservas', '{n} bookings', { n: t.count })}</span>
                      <span className="num font-medium text-ink">{fmtARSShort(t.revenue, lang)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Origen */}
        <ChartCard title={x('Origen de reservas', 'Booking sources')} subtitle={x('{n} reservas · {p}', '{n} bookings · {p}', { n: totalMix, p: periodLabel[key] })} height={290}>
          <div className="flex h-full flex-col">
            <div className="relative min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mix} dataKey="value" nameKey="key" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="var(--card)" strokeWidth={2} isAnimationActive>
                    {mix.map((m) => (
                      <Cell key={m.key} fill={ORIGEN_COLOR[m.key as Origen]} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} formatter={(v: number, n: string) => [x('{v} reservas', '{v} bookings', { v }), e('origen', n)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="num text-2xl text-ink">{totalMix ? Math.round(((mix.find((m) => m.key === 'fullday')?.value ?? 0) / totalMix) * 100) : 0}%</span>
                <span className="text-[11px] text-muted">{x('directas', 'direct')}</span>
              </div>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {mix.map((m) => (
                <li key={m.key} className="min-w-0 rounded-ctl bg-subtle px-2 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ORIGEN_COLOR[m.key as Origen] }} />
                    <span className="truncate">{e('origen', m.key)}</span>
                  </div>
                  <div className="num text-sm text-ink">{totalMix ? Math.round((m.value / totalMix) * 100) : 0}%</div>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        {/* Ocupación del mes */}
        <Card
          className="md:col-span-2 lg:col-span-2"
          title={x('Ocupación por propiedad · este mes', 'Occupancy by property · this month')}
          subtitle={x('Promedio {v}% · noches ocupadas sobre noches disponibles', 'Average {v}% · booked nights over available nights', { v: occAvg })}
        >
          <ul className={cn('grid gap-x-8 gap-y-3', ids.length > 4 && 'lg:grid-cols-2')}>
            {occ.map((o) => {
              const low = scope === 'admin' && o.id === lowest?.id;
              return (
                <li key={o.id} className={cn('min-w-0', low && '-mx-2 rounded-ctl bg-warn/[0.07] px-2 py-1.5')}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-ink">{nameOf(o.id)}</span>
                      {low && (
                        <Badge tone="warn" className="shrink-0">
                          <AlertTriangle size={11} />
                          {x('Ocupación baja', 'Low occupancy')}
                        </Badge>
                      )}
                    </span>
                    <span className={cn('num shrink-0', low ? 'text-warn' : 'text-ink')}>{o.v}%</span>
                  </div>
                  <Progress value={o.v} color={low ? 'var(--warn)' : o.v >= 70 ? 'var(--ok)' : undefined} />
                </li>
              );
            })}
          </ul>
          {scope === 'admin' && lowest && (
            <p className="mt-4 text-xs text-ink2">
              {x('Sugerencia: {p} está por debajo del resto. Probá bajar la estadía mínima o destacarla en el catálogo.', 'Tip: {p} is below the rest. Try lowering the minimum stay or featuring it in the catalog.', { p: nameOf(lowest.id) })}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
