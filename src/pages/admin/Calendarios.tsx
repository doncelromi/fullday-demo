import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Check, Copy, RefreshCw, RotateCcw, ShieldCheck, Terminal, X as XIcon } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { fullDayFeedUrl, propById } from '@/data/properties';
import { fmtDate, fmtMinAgo, fmtRange } from '@/lib/format';
import { cn, sleep } from '@/lib/utils';
import { Badge, Card, DevNotice, PageHeader, Photo, PreviewBanner } from '@/components/ui';
import type { FeedStatus, Propiedad, SyncLog } from '@/types';
import { LiveDot, Spin, truncUrl, useNow } from './_parts/shared';

export default function AdminCalendarios() {
  const { t, x, b, lang } = useT();
  const propiedades = useApp((s) => s.propiedades);
  const syncLogs = useApp((s) => s.syncLogs);
  const syncedAt = useApp((s) => s.syncedAt);
  const lastSyncMin = useApp((s) => s.lastSyncMin);
  const sincronizar = useApp((s) => s.sincronizar);
  const reintentarSync = useApp((s) => s.reintentarSync);
  const toast = useApp((s) => s.toast);
  const now = useNow(10000);

  const [syncing, setSyncing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const elapsed = Math.max(0, Math.floor((now - syncedAt) / 60000));
  const drift = Math.max(0, elapsed - lastSyncMin);
  const nextIn = 5 - (elapsed % 5);
  const feedMin = (f: FeedStatus) => f.ultimaSyncMin + drift;

  const rows = propiedades.filter((p) => p.feeds.airbnb || p.feeds.booking);
  const feeds = rows.flatMap((p) => [p.feeds.airbnb, p.feeds.booking].filter(Boolean) as FeedStatus[]);
  const errors = feeds.filter((f) => f.estado === 'error').length;

  const runSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await sleep(1500);
    const r = sincronizar();
    setSyncing(false);
    if (r)
      toast(
        x('Se detectó una reserva de Airbnb en {prop} · {range} · fechas bloqueadas en Full Day y Booking', 'An Airbnb booking was detected at {prop} · {range} · dates blocked on Full Day and Booking', {
          prop: r.prop,
          range: fmtRange(r.from, r.to, lang),
        }),
      );
    else toast(x('Todo sincronizado · sin cambios', 'Everything in sync · no changes'), 'info');
  };

  const retry = async (p: Propiedad, canal: 'airbnb' | 'booking', logId?: string) => {
    const key = logId ?? `${p.id}-${canal}`;
    setRetrying(key);
    await sleep(900);
    const log = logId ? syncLogs.find((l) => l.id === logId) : useApp.getState().syncLogs.find((l) => l.propiedadId === p.id && l.canal === canal && l.nivel === 'error' && !l.resuelto);
    if (log) reintentarSync(log.id);
    else useApp.getState().updatePropiedad(p.id, { feeds: { ...p.feeds, [canal]: { ...p.feeds[canal]!, estado: 'ok', ultimaSyncMin: 0, error: undefined } } });
    setRetrying(null);
    toast(x('{p} · feed de {c} sincronizado correctamente', '{p} · {c} feed synced successfully', { p: p.nombre, c: canal === 'airbnb' ? 'Airbnb' : 'Booking' }));
  };

  const copyFeed = async (p: Propiedad) => {
    const url = fullDayFeedUrl(p.slug);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* el portapapeles puede estar bloqueado en iframes: igual confirmamos */
    }
    toast(t('common.copied'));
  };

  const feedCell = (p: Propiedad, canal: 'airbnb' | 'booking') => {
    const f = p.feeds[canal];
    if (!f) return <span className="text-xs text-muted">{x('No conectado', 'Not connected')}</span>;
    const err = f.estado === 'error';
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', err ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok')}>{err ? <XIcon size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}</span>
          <span className="truncate font-mono text-[11.5px] text-ink2" title={f.url}>
            {truncUrl(f.url, 30)}
          </span>
        </div>
        {err && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-danger">{f.error ? b(f.error) : x('Error de lectura', 'Read error')}</span>
            <button className="btn-secondary btn-sm min-h-[32px] px-2 text-xs" onClick={() => retry(p, canal)} disabled={retrying === `${p.id}-${canal}`}>
              {retrying === `${p.id}-${canal}` ? <Spin className="h-3 w-3" /> : <RotateCcw size={12} />}
              {x('Reintentar', 'Retry')}
            </button>
          </div>
        )}
      </div>
    );
  };

  const lastOf = (p: Propiedad) => {
    const fs = [p.feeds.airbnb, p.feeds.booking].filter(Boolean) as FeedStatus[];
    const ok = fs.filter((f) => f.estado !== 'error');
    const m = ok.length ? Math.min(...ok.map(feedMin)) : Math.max(...fs.map(feedMin));
    return { min: m, err: fs.some((f) => f.estado === 'error') };
  };

  return (
    <div className="fade-up">
      <PageHeader
        title={x('Calendarios', 'Calendars')}
        subtitle={x('Estado de la sincronización iCal de cada anuncio con Airbnb y Booking.', 'iCal sync status of every listing with Airbnb and Booking.')}
        actions={
          <button className="btn-primary" onClick={runSync} disabled={syncing} data-trailer="btn-sync">
            {syncing ? <Spin /> : <RefreshCw size={16} />}
            {syncing ? x('Sincronizando…', 'Syncing…') : x('Sincronizar ahora', 'Sync now')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Lee los calendarios de Airbnb y Booking de cada casa y bloquea las fechas ocupadas en Full Day.', 'Reads every home’s Airbnb and Booking calendars and blocks taken dates on Full Day.'),
          x('Publica un calendario de Full Day para que Airbnb y Booking bloqueen lo que se reserva acá.', 'Publishes a Full Day calendar so Airbnb and Booking block what gets booked here.'),
          x('Registra cada lectura y avisa por WhatsApp si un feed falla, con reintento automático.', 'Logs every read and alerts via WhatsApp if a feed fails, with automatic retry.'),
        ]}
      />
      <DevNotice
        feature={x('Sincronización iCal', 'iCal sync')}
        now={x('se simulan las respuestas de Airbnb y Booking.', 'Airbnb and Booking responses are simulated.')}
        later={x('un proceso programado consulta los feeds reales cada 5 minutos y publica el calendario de Full Day.', 'a scheduled job polls the real feeds every 5 minutes and publishes the Full Day calendar.')}
      />

      {/* ---------- Flujo bidireccional ---------- */}
      <section className="card mb-5 overflow-hidden" data-tour="sync-flow">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-8">
          <div className="min-w-0 lg:w-[38%]">
            <div className="flex items-center gap-2">
              <LiveDot tone={errors ? 'warn' : 'ok'} />
              <span className="text-sm font-semibold text-ink">
                {x('Sincronizado {ago}', 'Synced {ago}', { ago: fmtMinAgo(elapsed, lang) })}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-ink">{x('Sincronización bidireccional con Airbnb', 'Two-way sync with Airbnb')}</h2>
            <p className="mt-1 text-[13px] text-ink2">
              {x('Una reserva en Full Day bloquea Airbnb y Booking, y viceversa. Nunca se vende la misma noche dos veces.', 'A booking on Full Day blocks Airbnb and Booking, and vice versa. The same night is never sold twice.')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge tone="ok">
                <ShieldCheck size={12} />
                {x('{n} feeds OK', '{n} feeds OK', { n: feeds.length - errors })}
              </Badge>
              {errors > 0 && <Badge tone="danger">{x('{n} con error', '{n} with errors', { n: errors })}</Badge>}
              <Badge tone="neutral">{x('Próximo chequeo en {n} min', 'Next check in {n} min', { n: nextIn })}</Badge>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 sm:gap-3">
              <Node label="Airbnb" sub={x('{n} feeds', '{n} feeds', { n: rows.filter((p) => p.feeds.airbnb).length })} tone="airbnb" />
              <Link active={syncing} />
              <Node label="Full Day" sub={x('fuente de verdad', 'source of truth')} tone="accent" main />
              <Link active={syncing} />
              <Node label="Booking" sub={x('{n} feeds', '{n} feeds', { n: rows.filter((p) => p.feeds.booking).length })} tone="booking" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] text-ink2 sm:grid-cols-2">
              <div className="rounded-ctl bg-subtle px-3 py-2">
                <b className="font-semibold text-ink">{x('Entrada:', 'Inbound:')}</b> {x('reserva en Airbnb → se bloquea en Full Day y Booking', 'Airbnb booking → blocked on Full Day and Booking')}
              </div>
              <div className="rounded-ctl bg-subtle px-3 py-2">
                <b className="font-semibold text-ink">{x('Salida:', 'Outbound:')}</b> {x('reserva en Full Day → Airbnb y Booking leen nuestro .ics', 'Full Day booking → Airbnb and Booking read our .ics')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------- Tabla (md+) ---------- */}
        <div className="min-w-0">
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    <th className="th">{x('Anuncio', 'Listing')}</th>
                    <th className="th">Airbnb</th>
                    <th className="th">Booking</th>
                    <th className="th hidden lg:table-cell">{x('Última sync', 'Last sync')}</th>
                    <th className="th">{x('Calendario Full Day', 'Full Day calendar')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((p) => {
                    const l = lastOf(p);
                    return (
                      <tr key={p.id} className={cn(l.err && 'bg-danger/[0.03]')}>
                        <td className="td">
                          <div className="flex min-w-[160px] items-center gap-2.5">
                            <Photo src={p.fotos[0]} alt={p.nombre} ratio="1/1" className="w-9 shrink-0 rounded-md" />
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold">{p.nombre}</div>
                              <div className="text-[11px] text-muted lg:hidden">{fmtMinAgo(l.min, lang)}</div>
                              <div className="hidden text-[11px] text-muted lg:block">{p.tipo === 'experiencia' ? x('Experiencia', 'Experience') : x('Alojamiento', 'Home')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="td max-w-[200px]">
                          {feedCell(p, 'airbnb')}
                        </td>
                        <td className="td max-w-[200px]">
                          {feedCell(p, 'booking')}
                        </td>
                        <td className="td hidden whitespace-nowrap lg:table-cell">
                          <div className={cn('text-[13px]', l.err ? 'text-danger' : 'text-ink')}>{fmtMinAgo(l.min, lang)}</div>
                          <div className="text-[11px] text-muted">{x('próximo en {n} min', 'next in {n} min', { n: nextIn })}</div>
                        </td>
                        <td className="td">
                          <button className="btn-secondary btn-sm whitespace-nowrap" onClick={() => copyFeed(p)} title={fullDayFeedUrl(p.slug)}>
                            <Copy size={13} />
                            {x('Copiar .ics', 'Copy .ics')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---------- Cards mobile ---------- */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {rows.map((p) => {
              const l = lastOf(p);
              return (
                <div key={p.id} className={cn('card p-4', l.err && 'border-danger/40')}>
                  <div className="flex items-center gap-3">
                    <Photo src={p.fotos[0]} alt={p.nombre} ratio="1/1" className="w-11 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">{p.nombre}</div>
                      <div className={cn('text-xs', l.err ? 'text-danger' : 'text-ink2')}>
                        {fmtMinAgo(l.min, lang)} · {x('próximo en {n} min', 'next in {n} min', { n: nextIn })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2.5 border-t border-line pt-3">
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-airbnb">Airbnb</div>
                      {feedCell(p, 'airbnb')}
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-booking">Booking</div>
                      {feedCell(p, 'booking')}
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm mt-3 w-full" onClick={() => copyFeed(p)}>
                    <Copy size={13} />
                    {x('Copiar calendario Full Day (.ics)', 'Copy Full Day calendar (.ics)')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- Log técnico ---------- */}
        <Card
          className="self-start xl:sticky xl:top-24"
          title={
            <span className="flex items-center gap-2">
              <Terminal size={15} className="text-muted" />
              {x('Log de sincronización', 'Sync log')}
            </span>
          }
          subtitle={x('Últimos eventos del proceso iCal', 'Latest iCal job events')}
          bodyClass="p-0 sm:p-0"
        >
          <ul className="max-h-[560px] divide-y divide-line overflow-y-auto font-mono text-[12px]">
            <AnimatePresence initial={false}>
              {syncLogs.slice(0, 30).map((l) => (
                <motion.li key={l.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={cn('px-4 py-3', l.nivel === 'error' && !l.resuelto && 'bg-danger/[0.05]')}>
                  {logLine(l)}
                  {l.nivel === 'error' && !l.resuelto && (
                    <button className="btn-secondary btn-sm mt-2 font-sans" onClick={() => retry(propById(l.propiedadId), l.canal, l.id)} disabled={retrying === l.id}>
                      {retrying === l.id ? <Spin className="h-3 w-3" /> : <RotateCcw size={13} />}
                      {x('Reintentar', 'Retry')}
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Card>
      </div>
    </div>
  );

  function logLine(l: SyncLog) {
    const lvl = l.nivel === 'error' ? (l.resuelto ? 'RESOLVED' : 'ERROR') : l.nivel === 'info' ? 'INFO' : 'OK';
    const c = l.nivel === 'error' ? (l.resuelto ? 'text-muted' : 'text-danger') : l.nivel === 'info' ? 'text-info' : 'text-ok';
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
          <span>{fmtDate(l.fecha, 'dd/MM HH:mm:ss', lang)}</span>
          <span className={cn('font-semibold', c)}>[{lvl}]</span>
          <span className={l.canal === 'airbnb' ? 'text-airbnb' : 'text-booking'}>{l.canal}</span>
          {l.reintentos ? <span>retries={l.reintentos}</span> : null}
        </div>
        <div className="mt-0.5 break-words text-ink">
          <span className="text-ink2">{propById(l.propiedadId).slug}</span> · {b(l.texto)}
        </div>
      </div>
    );
  }
}

function Node({ label, sub, tone, main }: { label: string; sub: string; tone: 'airbnb' | 'booking' | 'accent'; main?: boolean }) {
  const c = tone === 'airbnb' ? 'border-airbnb/30 bg-airbnb/10 text-airbnb' : tone === 'booking' ? 'border-booking/30 bg-booking/10 text-booking' : 'border-accent bg-accent text-accent-fg';
  return (
    <div className={cn('flex min-w-0 shrink-0 flex-col items-center justify-center rounded-card border px-2 py-2.5 text-center sm:px-4', c, main ? 'w-[92px] shadow-md sm:w-[120px]' : 'w-[78px] sm:w-[104px]')}>
      <span className="text-[13px] font-bold sm:text-sm">{label}</span>
      <span className={cn('mt-0.5 text-[10px] leading-tight', main ? 'text-accent-fg/85' : 'opacity-80')}>{sub}</span>
    </div>
  );
}

function Link({ active }: { active: boolean }) {
  return (
    <div className="relative flex min-w-[18px] flex-1 items-center justify-center">
      <div className="h-[2px] w-full rounded-full bg-line-strong" />
      <motion.span
        className="absolute h-2 w-2 rounded-full bg-ok"
        animate={{ left: ['0%', '100%', '0%'] }}
        transition={{ duration: active ? 1.1 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ translateX: '-50%' }}
      />
      <span className="absolute flex h-6 w-6 items-center justify-center rounded-full border border-line bg-card text-ink2">
        <ArrowLeftRight size={12} />
      </span>
    </div>
  );
}
