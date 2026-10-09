import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addDays, addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, max as maxD, min as minD, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, List, Lock, RefreshCw, Users } from 'lucide-react';
import { Badge, DevNotice, EstadoPill, OrigenPill, PageHeader, Photo, PreviewBanner, Segmented, SidePanel, useMedia } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { MARIELA_PROPS, occupancy } from '@/data/selectors';
import { TODAY } from '@/data/seed';
import { cn } from '@/lib/utils';
import { fmtARS, fmtDay, fmtDayLong, fmtMinAgo, fmtRange, fmtRelative, iso, locale, nights } from '@/lib/format';
import type { Origen, Reserva } from '@/types';
import { CancelModal } from '@/pages/shared/CancelModal';
import { LiveDot, useSyncMin } from '@/pages/shared/sync';

const INITIALS: Record<string, string> = { 'p-olivar': 'CO', 'p-alamos': 'LA', 'p-viamonte': 'LV' };

const CHIP: Record<Origen, string> = {
  fullday: 'bg-accent text-white',
  airbnb: 'bg-airbnb text-white',
  booking: 'bg-booking text-white',
  bloqueo: 'border border-line-strong text-ink2',
};
const STRIPES = 'repeating-linear-gradient(135deg, var(--bg-soft) 0 5px, color-mix(in srgb, var(--muted) 28%, transparent) 5px 10px)';
const DOT: Record<Origen, string> = { fullday: 'bg-accent', airbnb: 'bg-airbnb', booking: 'bg-booking', bloqueo: 'bg-muted' };

interface Seg {
  r: Reserva;
  col: number;
  span: number;
  lane: number;
  contL: boolean;
  contR: boolean;
}

export default function OwnerCalendario() {
  const { x, e, lang } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const reservas = useApp((s) => s.reservas);
  const propiedades = useApp((s) => s.propiedades);
  const sincronizar = useApp((s) => s.sincronizar);
  const toast = useApp((s) => s.toast);
  const syncMin = useSyncMin();
  const isMobile = useMedia('(max-width: 639px)');
  const isDesktop = useMedia('(min-width: 1024px)');

  const initialProp = (location.state as { prop?: string } | null)?.prop;
  const [sel, setSel] = useState<string>(initialProp && MARIELA_PROPS.includes(initialProp) ? initialProp : 'all');
  const [month, setMonth] = useState(() => startOfMonth(TODAY));
  const [mode, setMode] = useState<'mes' | 'agenda'>(() => (window.matchMedia('(max-width: 639px)').matches ? 'agenda' : 'mes'));
  const [syncing, setSyncing] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const view = isMobile ? mode : 'mes';
  const props = useMemo(() => MARIELA_PROPS.map((id) => propiedades.find((p) => p.id === id)!).filter(Boolean), [propiedades]);
  const propOf = (id: string) => propiedades.find((p) => p.id === id);
  const visible = useMemo(() => reservas.filter((r) => MARIELA_PROPS.includes(r.propiedadId) && r.estado !== 'cancelada' && (sel === 'all' || r.propiedadId === sel)), [reservas, sel]);

  const mStart = month;
  const mEnd = useMemo(() => endOfMonth(month), [month]);
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(mStart, { weekStartsOn: 1 }), end: endOfWeek(mEnd, { weekStartsOn: 1 }) }), [mStart, mEnd]);
  const weeks = useMemo(() => Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7)), [days]);
  const lanes = sel === 'all' ? MARIELA_PROPS.length : 1;

  const segsFor = (week: Date[]): Seg[] => {
    const ws = week[0];
    const we = week[6];
    const out: Seg[] = [];
    for (const r of visible) {
      const a = parseISO(r.checkIn);
      const last = addDays(parseISO(r.checkOut), -1);
      if (last < ws || a > we || last < a) continue;
      const s = maxD([a, ws]);
      const en = minD([last, we]);
      out.push({ r, col: differenceInCalendarDays(s, ws), span: differenceInCalendarDays(en, s) + 1, lane: sel === 'all' ? MARIELA_PROPS.indexOf(r.propiedadId) : 0, contL: a < ws, contR: last > we });
    }
    return out;
  };

  // Resumen del mes visible
  const monthStats = useMemo(() => {
    const ids = sel === 'all' ? MARIELA_PROPS : [sel];
    const per = { from: mStart, to: mEnd };
    const inMonth = visible.filter((r) => r.origen !== 'bloqueo' && r.checkOut > iso(mStart) && r.checkIn <= iso(mEnd));
    const by = (o: Origen) => inMonth.filter((r) => r.origen === o).length;
    return { occ: occupancy(reservas, per, ids), count: inMonth.length, fd: by('fullday'), ab: by('airbnb'), bk: by('booking') };
  }, [visible, reservas, sel, mStart, mEnd]);

  // Agenda (mobile): agrupada por día de check-in
  const agenda = useMemo(() => {
    const list = visible.filter((r) => r.checkOut > iso(mStart) && r.checkIn <= iso(mEnd)).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    const groups: { key: string; items: Reserva[] }[] = [];
    for (const r of list) {
      const k = r.checkIn < iso(mStart) ? iso(mStart) : r.checkIn;
      const g = groups.find((z) => z.key === k);
      if (g) g.items.push(r);
      else groups.push({ key: k, items: [r] });
    }
    return groups;
  }, [visible, mStart, mEnd]);

  const doSync = () => {
    if (syncing) return;
    setSyncing(true);
    timer.current = window.setTimeout(() => {
      const res = sincronizar();
      setSyncing(false);
      if (res) {
        toast(x('Airbnb: nueva reserva en {p} ({a} → {b}) · bloqueada en Booking y Full Day', 'Airbnb: new booking at {p} ({a} → {b}) · blocked on Booking and Full Day', { p: res.prop, a: fmtDay(res.from, lang), b: fmtDay(res.to, lang) }), 'info');
        setMonth(startOfMonth(parseISO(res.from)));
        if (sel !== 'all' && sel !== 'p-olivar') setSel('all');
      } else toast(x('Calendarios al día · sin cambios en Airbnb ni Booking', 'Calendars up to date · no changes on Airbnb or Booking'));
    }, 1500);
  };

  const detail = detailId ? reservas.find((r) => r.id === detailId) : undefined;
  const detailProp = detail ? propOf(detail.propiedadId) : undefined;
  const releaseR = releaseId ? reservas.find((r) => r.id === releaseId) ?? null : null;
  const firstName = (r: Reserva) => (r.origen === 'bloqueo' ? x('Bloqueo', 'Block') : r.huespedNombre.split(' ')[0]);
  const chipLabel = (r: Reserva) => {
    const name = firstName(r);
    if (sel !== 'all') return name;
    if (!isDesktop) return INITIALS[r.propiedadId];
    return `${INITIALS[r.propiedadId]} · ${name}`;
  };
  const isToday = (d: Date) => isSameDay(d, TODAY);
  const monthLabel = format(month, 'MMMM yyyy', { locale: locale(lang) });
  const isCurMonth = isSameMonth(month, TODAY);
  const laneH = isDesktop ? 24 : isMobile ? 16 : 20;
  const headH = isMobile ? 24 : 30;

  return (
    <>
      <PageHeader
        title={x('Calendario unificado', 'Unified calendar')}
        subtitle={x('Tus 3 casas en una sola vista: lo que entra por Full Day, Airbnb y Booking, sin dobles reservas.', 'Your 3 homes in one view: everything from Full Day, Airbnb and Booking, with no double bookings.')}
        actions={
          <button className="btn-primary" onClick={doSync} disabled={syncing}>
            <RefreshCw size={16} className={cn(syncing && 'animate-spin')} />
            {syncing ? x('Sincronizando…', 'Syncing…') : x('Sincronizar ahora', 'Sync now')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Un calendario por casa que combina Full Day, Airbnb y Booking con colores por canal.', 'One calendar per home combining Full Day, Airbnb and Booking, color-coded by channel.'),
          x('Cuando entra una reserva en un canal, las fechas se bloquean solas en los otros dos.', 'When a booking comes in on one channel, the dates are blocked automatically on the other two.'),
          x('Mariela bloquea fechas a mano (uso propio, mantenimiento) y se replica en todos lados.', 'Mariela blocks dates manually (own use, maintenance) and it’s mirrored everywhere.'),
        ]}
      />

      {/* Estado de sincronización */}
      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          {syncing ? <RefreshCw size={16} className="shrink-0 animate-spin text-accent" /> : <LiveDot />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">
              {syncing ? x('Leyendo calendarios de Airbnb y Booking…', 'Reading Airbnb and Booking calendars…') : x('Sincronizado con Airbnb y Booking {t}', 'Synced with Airbnb and Booking {t}', { t: fmtMinAgo(syncMin, lang) })}
            </div>
            <div className="text-xs text-muted">{x('Lectura automática cada 5 minutos · {n} feeds iCal activos', 'Automatic read every 5 minutes · {n} active iCal feeds', { n: props.reduce((a, p) => a + (p.feeds.airbnb ? 1 : 0) + (p.feeds.booking ? 1 : 0), 0) })}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {props.map((p) => (
            <span key={p.id} className="pill border border-line bg-subtle text-ink2">
              <span className="num text-[10px] text-muted">{INITIALS[p.id]}</span>
              {p.feeds.airbnb && <span className="text-airbnb">Airbnb ✓</span>}
              {p.feeds.booking && <span className="text-booking">Booking ✓</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Controles */}
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={sel}
          onChange={setSel}
          options={[{ value: 'all', label: x('Todas', 'All') }, ...props.map((p) => ({ value: p.id, label: p.nombre }))]}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink2">
          {(['fullday', 'airbnb', 'booking', 'bloqueo'] as Origen[]).map((o) => (
            <span key={o} className="inline-flex items-center gap-1.5">
              <span className={cn('h-3 w-5 rounded-[4px]', o !== 'bloqueo' && DOT[o], o === 'bloqueo' && 'border border-line-strong')} style={o === 'bloqueo' ? { background: STRIPES } : undefined} />
              {e('origen', o)}
            </span>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden" data-trailer="calendario">
        {/* Navegación de mes */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-2 py-2 sm:px-4">
          <div className="flex items-center gap-1">
            <button className="icon-btn" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label={x('Mes anterior', 'Previous month')}>
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[128px] text-center text-base font-semibold capitalize text-ink sm:min-w-[160px]">{monthLabel}</div>
            <button className="icon-btn" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label={x('Mes siguiente', 'Next month')}>
              <ChevronRight size={18} />
            </button>
            <button className="btn-secondary btn-sm ml-1" disabled={isCurMonth} onClick={() => setMonth(startOfMonth(TODAY))}>
              {x('Hoy', 'Today')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-ink2 md:inline">
              {x('{n} reservas · {o}% ocupación', '{n} bookings · {o}% occupancy', { n: monthStats.count, o: monthStats.occ })}
            </span>
            {isMobile && (
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'agenda', label: <><List size={14} />{x('Agenda', 'Agenda')}</> },
                  { value: 'mes', label: <><CalendarDays size={14} />{x('Mes', 'Month')}</> },
                ]}
              />
            )}
          </div>
        </div>

        {view === 'mes' ? (
          <div>
            {/* Encabezado de días (lunes primero) */}
            <div className="grid grid-cols-7 border-b border-line bg-subtle">
              {days.slice(0, 7).map((d) => (
                <div key={d.toISOString()} className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-muted sm:px-2 sm:text-left">
                  {format(d, isMobile ? 'EEEEE' : 'EEE', { locale: locale(lang) }).replace('.', '')}
                </div>
              ))}
            </div>
            {weeks.map((week) => {
              const segs = segsFor(week);
              return (
                <div key={week[0].toISOString()} className="relative border-b border-line last:border-b-0">
                  <div className="absolute inset-0 grid grid-cols-7" aria-hidden>
                    {week.map((d) => (
                      <div key={d.toISOString()} className={cn('border-r border-line last:border-r-0', !isSameMonth(d, month) && 'bg-subtle/70', isToday(d) && 'bg-accent-soft/60')} />
                    ))}
                  </div>
                  <div className="relative grid grid-cols-7 pb-2" style={{ gridTemplateRows: `${headH}px repeat(${lanes}, ${laneH}px)`, rowGap: 3, minHeight: isDesktop ? 112 : isMobile ? 76 : 96 }}>
                    {week.map((d, i) => (
                      <div key={d.toISOString()} style={{ gridColumn: i + 1, gridRow: 1 }} className="flex justify-center px-1 pt-1 sm:justify-start sm:px-1.5">
                        <span
                          className={cn(
                            'num inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px]',
                            isToday(d) ? 'bg-accent font-bold text-accent-fg' : isSameMonth(d, month) ? 'font-medium text-ink' : 'font-normal text-muted',
                          )}
                        >
                          {d.getDate()}
                        </span>
                        {isToday(d) && isDesktop && <span className="ml-1.5 self-center text-[10px] font-bold uppercase tracking-wide text-accent">{x('Hoy', 'Today')}</span>}
                      </div>
                    ))}
                    {segs.map((s) => (
                      <button
                        key={`${s.r.id}-${s.col}`}
                        type="button"
                        onClick={() => setDetailId(s.r.id)}
                        title={`${s.r.huespedNombre} · ${propOf(s.r.propiedadId)?.nombre} · ${fmtRange(s.r.checkIn, s.r.checkOut, lang)}`}
                        style={{ gridColumn: `${s.col + 1} / span ${s.span}`, gridRow: s.lane + 2, background: s.r.origen === 'bloqueo' ? STRIPES : undefined }}
                        className={cn(
                          'relative z-[1] flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap px-1.5 text-left font-semibold shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
                          isMobile ? 'text-[9.5px]' : 'text-[11px]',
                          CHIP[s.r.origen],
                          s.contL ? 'ml-0 rounded-l-none' : 'ml-1 rounded-l-[6px]',
                          s.contR ? 'mr-0 rounded-r-none' : 'mr-1 rounded-r-[6px]',
                          s.r.nueva && 'animate-pulse ring-2 ring-accent ring-offset-1 ring-offset-card',
                        )}
                      >
                        {s.r.origen === 'bloqueo' && !isMobile && <Lock size={10} className="shrink-0" />}
                        <span className="truncate">{chipLabel(s.r)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {agenda.length === 0 && <div className="px-4 py-12 text-center text-sm text-muted">{x('No hay reservas este mes.', 'No bookings this month.')}</div>}
            {agenda.map((g) => {
              const d = parseISO(g.key);
              const today = isSameDay(d, TODAY);
              return (
                <div key={g.key} className={cn('px-3 py-3', today && 'bg-accent-soft/40')}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn('text-[13px] font-semibold capitalize', today ? 'text-accent' : 'text-ink')}>{fmtDayLong(d, lang)}</span>
                    {today && <Badge tone="accent">{x('Hoy', 'Today')}</Badge>}
                  </div>
                  <ul className="space-y-2">
                    {g.items.map((r) => {
                      const ongoing = r.checkIn < iso(mStart);
                      return (
                        <li key={r.id}>
                          <button onClick={() => setDetailId(r.id)} className={cn('flex w-full min-w-0 items-stretch gap-3 rounded-ctl border border-line bg-card text-left shadow-sm', r.nueva && 'animate-pulse ring-2 ring-accent')}>
                            <span className={cn('w-1.5 shrink-0 rounded-l-ctl', DOT[r.origen])} style={r.origen === 'bloqueo' ? { background: STRIPES } : undefined} />
                            <span className="min-w-0 flex-1 py-2.5 pr-3">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-ink">{r.origen === 'bloqueo' ? x('Bloqueo manual', 'Manual block') : r.huespedNombre}</span>
                                <OrigenPill v={r.origen} />
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-ink2">{propOf(r.propiedadId)?.nombre}</span>
                              <span className="num mt-1 block text-xs text-ink2">
                                {fmtRange(r.checkIn, r.checkOut, lang)} · {x('{n} noches', '{n} nights', { n: nights(r.checkIn, r.checkOut) })}
                                {ongoing && <span className="ml-1 font-sans text-muted">· {x('viene del mes anterior', 'from last month')}</span>}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sel === 'all' && view === 'mes' && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-ink2">
          {props.map((p) => (
            <span key={p.id}>
              <b className="num text-ink">{INITIALS[p.id]}</b> {p.nombre}
            </span>
          ))}
          <span className="text-muted">· {x('una fila por casa', 'one row per home')}</span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { k: 'fullday' as Origen, n: monthStats.fd },
          { k: 'airbnb' as Origen, n: monthStats.ab },
          { k: 'booking' as Origen, n: monthStats.bk },
        ].map((s) => (
          <div key={s.k} className="card min-w-0 p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-ink2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT[s.k])} />
              <span className="truncate">{e('origen', s.k)}</span>
            </div>
            <div className="num mt-1 text-xl text-ink">{s.n}</div>
            <div className="truncate text-[11px] text-muted">{x('reservas en {m}', 'bookings in {m}', { m: format(month, 'MMMM', { locale: locale(lang) }) })}</div>
          </div>
        ))}
      </div>

      <DevNotice
        className="mt-4"
        feature={x('Sincronización iCal con Airbnb y Booking', 'iCal sync with Airbnb and Booking')}
        now={x('las importaciones se simulan.', 'imports are simulated.')}
        later={x('Full Day lee los calendarios de Airbnb y Booking cada pocos minutos y publica el suyo para que ambos canales bloqueen las fechas.', 'Full Day reads the Airbnb and Booking calendars every few minutes and publishes its own so both channels block the dates.')}
      />

      <SidePanel
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={detail ? (detail.origen === 'bloqueo' ? x('Bloqueo manual', 'Manual block') : detail.huespedNombre) : ''}
        footer={
          detail &&
          (detail.origen === 'bloqueo' ? (
            <button className="btn-secondary w-full text-danger" disabled={detail.checkOut <= iso(TODAY)} onClick={() => setReleaseId(detail.id)}>
              <Lock size={16} />
              {x('Liberar fechas', 'Release dates')}
            </button>
          ) : (
            <button className="btn-primary w-full" onClick={() => navigate('/propietario/reservas', { state: { open: detail.id } })}>
              {x('Ver reserva', 'View booking')}
              <ArrowRight size={16} />
            </button>
          ))
        }
      >
        {detail && detailProp && (
          <div className="space-y-4">
            {detail.nueva && (
              <Badge tone="accent" className="ring-2 ring-accent/40">
                {x('Nueva · recién importada', 'New · just imported')}
              </Badge>
            )}
            <div className="flex gap-3">
              <Photo src={detailProp.fotos[0]} alt={detailProp.nombre} className="w-24 shrink-0 rounded-ctl" />
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{detailProp.nombre}</div>
                <div className="num text-xs text-ink2">{detail.origen === 'bloqueo' ? '' : detail.id}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <OrigenPill v={detail.origen} />
                  <EstadoPill v={detail.estado} />
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-card border border-line p-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Check-in</dt>
                <dd className="mt-0.5 capitalize text-ink">{fmtDayLong(detail.checkIn, lang)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Check-out</dt>
                <dd className="mt-0.5 capitalize text-ink">{fmtDayLong(detail.checkOut, lang)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">{x('Noches', 'Nights')}</dt>
                <dd className="num mt-0.5 text-ink">{nights(detail.checkIn, detail.checkOut)}</dd>
              </div>
              {detail.origen !== 'bloqueo' ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">{x('Huéspedes', 'Guests')}</dt>
                  <dd className="num mt-0.5 flex items-center gap-1 text-ink">
                    <Users size={13} className="text-muted" />
                    {detail.huespedes}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">{x('Creado', 'Created')}</dt>
                  <dd className="mt-0.5 text-ink">{fmtRelative(detail.creada, lang)}</dd>
                </div>
              )}
              {detail.origen !== 'bloqueo' && (
                <div className="col-span-2 border-t border-line pt-3">
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">{x('Monto', 'Amount')}</dt>
                  <dd className="num mt-0.5 text-lg text-ink">{fmtARS(detail.monto, lang)}</dd>
                </div>
              )}
            </dl>
            <p className="text-xs text-ink2">
              {detail.origen === 'fullday'
                ? x('Reserva directa por Full Day: pago con Mercado Pago e identidad verificada.', 'Direct Full Day booking: paid via Mercado Pago, identity verified.')
                : detail.origen === 'bloqueo'
                  ? x('Fechas bloqueadas por vos. Se ven como no disponibles en Airbnb y Booking.', 'Dates you blocked. They show as unavailable on Airbnb and Booking.')
                  : x('Importada desde {c} vía iCal. Las fechas ya están bloqueadas en los otros canales.', 'Imported from {c} via iCal. The dates are already blocked on the other channels.', { c: e('origen', detail.origen) })}
            </p>
          </div>
        )}
      </SidePanel>

      <CancelModal reserva={releaseR} open={!!releaseR} onClose={() => setReleaseId(null)} actor="Mariela Ruiz" onDone={() => setDetailId(null)} />
    </>
  );
}
