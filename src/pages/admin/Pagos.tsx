import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Clock, CreditCard, Webhook, Zap } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { propById } from '@/data/properties';
import { fmtARS, fmtARSShort, fmtDate, fmtDateTime } from '@/lib/format';
import { cn, sleep } from '@/lib/utils';
import { DevNotice, KpiCard, PageHeader, PagoPill, PreviewBanner, Segmented, Empty } from '@/components/ui';
import type { EstadoPago, WebhookLog } from '@/types';
import { Spin } from './_parts/shared';

type Filtro = 'todos' | EstadoPago;

export default function AdminPagos() {
  const { x, e, b, lang } = useT();
  const navigate = useNavigate();
  const pagos = useApp((s) => s.pagos);
  const reservas = useApp((s) => s.reservas);
  const webhooks = useApp((s) => s.webhooks);
  const simularWebhook = useApp((s) => s.simularWebhook);
  const toast = useApp((s) => s.toast);

  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [mobileTab, setMobileTab] = useState<'tx' | 'wh'>('tx');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(25);
  const [freshId, setFreshId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const byId = new Map(reservas.map((r) => [r.id, r]));
    return [...pagos]
      .sort((a, z) => Number(z.estado === 'pendiente') - Number(a.estado === 'pendiente') || z.fecha.localeCompare(a.fecha))
      .map((p) => {
        const r = byId.get(p.reservaId);
        return { p, r, prop: r ? propById(r.propiedadId) : undefined };
      });
  }, [pagos, reservas]);

  const counts = useMemo(() => {
    const c: Record<Filtro, number> = { todos: pagos.length, aprobado: 0, pendiente: 0, rechazado: 0, expirado: 0 };
    for (const p of pagos) c[p.estado]++;
    return c;
  }, [pagos]);

  const shown = rows.filter((r) => filtro === 'todos' || r.p.estado === filtro);

  const kpis = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    const last30 = pagos.filter((p) => new Date(p.fecha).getTime() >= cutoff);
    const ok = last30.filter((p) => p.estado === 'aprobado');
    const closed = last30.filter((p) => p.estado !== 'pendiente');
    return {
      cobrado: ok.reduce((a, p) => a + p.monto, 0),
      okCount: ok.length,
      rate: closed.length ? Math.round((ok.length / closed.length) * 100) : 100,
      pendMonto: pagos.filter((p) => p.estado === 'pendiente').reduce((a, p) => a + p.monto, 0),
    };
  }, [pagos]);

  const simulate = async () => {
    if (busy) return;
    setBusy(true);
    await sleep(700);
    const r = simularWebhook();
    setBusy(false);
    if (!r) {
      toast(x('No hay pagos pendientes', 'No pending payments'), 'info');
      return;
    }
    setFreshId(useApp.getState().webhooks[0]?.id ?? null);
    setMobileTab('wh');
    toast(x('Webhook recibido · {p} aprobado → reserva {r} confirmada', 'Webhook received · {p} approved → booking {r} confirmed', { p: r.pagoId, r: r.reservaId }));
  };

  const last = webhooks[0];

  const txList = (
    <div className="min-w-0">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={filtro}
          onChange={(v) => {
            setFiltro(v);
            setLimit(25);
          }}
          options={[
            { value: 'todos', label: x('Todos', 'All'), count: counts.todos },
            { value: 'pendiente', label: e('pago', 'pendiente'), count: counts.pendiente },
            { value: 'aprobado', label: e('pago', 'aprobado'), count: counts.aprobado },
            { value: 'rechazado', label: e('pago', 'rechazado'), count: counts.rechazado },
            { value: 'expirado', label: e('pago', 'expirado'), count: counts.expirado },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <Empty text={x('No hay pagos con este estado.', 'No payments with this status.')} />
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    <th className="th">ID MP</th>
                    <th className="th">{x('Reserva', 'Booking')}</th>
                    <th className="th hidden lg:table-cell">{x('Huésped', 'Guest')}</th>
                    <th className="th text-right">{x('Monto', 'Amount')}</th>
                    <th className="th hidden 2xl:table-cell">{x('Medio', 'Method')}</th>
                    <th className="th">{x('Estado', 'Status')}</th>
                    <th className="th hidden lg:table-cell">{x('Fecha', 'Date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.slice(0, limit).map(({ p, r, prop }) => (
                    <tr key={p.id} className={cn('cursor-pointer transition hover:bg-subtle/60', p.estado === 'pendiente' && 'bg-warn/[0.04]')} onClick={() => r && navigate(`/admin/reservas/${r.id}`)}>
                      <td className="td whitespace-nowrap font-mono text-[12.5px] font-semibold">{p.id}</td>
                      <td className="td">
                        <div className="font-mono text-[12.5px] text-accent">{p.reservaId}</div>
                        <div className="max-w-[180px] truncate text-[11px] text-muted">{prop?.nombre}</div>
                      </td>
                      <td className="td hidden max-w-[180px] truncate text-[13px] lg:table-cell">{r?.huespedNombre}</td>
                      <td className="td num whitespace-nowrap text-right text-[13px]">{fmtARS(p.monto, lang)}</td>
                      <td className="td hidden whitespace-nowrap text-[13px] text-ink2 2xl:table-cell">{e('medio', p.medio)}</td>
                      <td className="td">
                        <PagoPill v={p.estado} />
                        {p.estado === 'pendiente' && p.expiraHoras !== undefined && (
                          <div className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-warn">
                            <Clock size={11} />
                            {x('expira en {n} h', 'expires in {n} h', { n: p.expiraHoras })}
                          </div>
                        )}
                      </td>
                      <td className="td hidden whitespace-nowrap text-[12.5px] text-ink2 lg:table-cell">{fmtDateTime(p.fecha, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {shown.slice(0, limit).map(({ p, r, prop }) => (
              <button key={p.id} onClick={() => r && navigate(`/admin/reservas/${r.id}`)} className={cn('card w-full p-3.5 text-left', p.estado === 'pendiente' && 'border-warn/40')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[12.5px] font-semibold text-ink">{p.id}</div>
                    <div className="truncate text-[13px] text-ink">{r?.huespedNombre}</div>
                    <div className="truncate text-xs text-muted">
                      <span className="font-mono text-accent">{p.reservaId}</span> · {prop?.nombre}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="num text-sm text-ink">{fmtARS(p.monto, lang)}</div>
                    <div className="mt-1">
                      <PagoPill v={p.estado} />
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[11px] text-ink2">
                  <span>{e('medio', p.medio)}</span>
                  {p.estado === 'pendiente' && p.expiraHoras !== undefined ? (
                    <span className="flex items-center gap-1 font-medium text-warn">
                      <Clock size={11} />
                      {x('expira en {n} h', 'expires in {n} h', { n: p.expiraHoras })}
                    </span>
                  ) : (
                    <span>{fmtDateTime(p.fecha, lang)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          {shown.length > limit && (
            <div className="mt-3 flex justify-center">
              <button className="btn-secondary btn-sm" onClick={() => setLimit((l) => l + 25)}>
                {x('Ver más ({n} restantes)', 'Show more ({n} left)', { n: shown.length - limit })}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const whPanel = (
    <section className="min-w-0 overflow-hidden rounded-card border border-navy-deep bg-navy-deep text-white shadow-md xl:sticky xl:top-24" data-tour="webhooks-log">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Webhook size={15} className="shrink-0 text-white/60" />
          <span className="truncate text-sm font-semibold">{x('Webhooks recibidos', 'Received webhooks')}</span>
        </div>
        <span className="shrink-0 font-mono text-[10.5px] text-white/50">POST /api/mp/webhook</span>
      </div>
      <ul className="max-h-[440px] overflow-y-auto px-2 py-2 font-mono text-[12px] leading-relaxed">
        <AnimatePresence initial={false}>
          {webhooks.slice(0, 40).map((w) => (
            <motion.li
              key={w.id}
              layout
              initial={{ opacity: 0, x: -14, backgroundColor: 'rgba(74,222,128,0.18)' }}
              animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(74,222,128,0)' }}
              transition={{ duration: 0.5, backgroundColor: { duration: 2.2 } }}
              className={cn('rounded-md px-2 py-1.5', freshId === w.id && 'ring-1 ring-emerald-400/40')}
            >
              {whLine(w)}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {last && (
        <details className="group border-t border-white/10">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 text-[12.5px] font-medium text-white/80 hover:text-white">
            <span>
              {x('Payload del último webhook', 'Last webhook payload')} · <span className="font-mono text-white/55">{last.pagoId}</span>
            </span>
            <ChevronDown size={15} className="transition group-open:rotate-180" />
          </summary>
          <pre className="max-h-[260px] overflow-auto px-4 pb-4 font-mono text-[11.5px] leading-relaxed text-emerald-200/90">{JSON.stringify(payloadOf(last), null, 2)}</pre>
        </details>
      )}
      <div className="border-t border-white/10 px-4 py-2.5 text-[11px] text-white/45">{x('La firma x-signature se valida antes de procesar cada evento.', 'The x-signature header is validated before processing each event.')}</div>
    </section>
  );

  function whLine(w: WebhookLog) {
    const okState = w.estado === 'aprobado';
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-white/45">
          <span>{fmtDate(w.fecha, 'dd/MM HH:mm:ss', lang)}</span>
          <span className="rounded bg-emerald-400/15 px-1.5 font-semibold text-emerald-300">HTTP {w.http}</span>
        </div>
        <div className="break-words">
          <span className="text-sky-300">{w.evento}</span>
          <span className="text-white/40"> · </span>
          <span className="text-white">{w.pagoId}</span>
          <span className="text-white/40"> · </span>
          <span className={okState ? 'text-emerald-300' : 'text-rose-300'}>{okState ? 'approved' : w.estado === 'rechazado' ? 'rejected' : w.estado}</span>
          <span className="text-white/40"> → </span>
          <span className="text-white/80">{b(w.resultado)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <PageHeader
        title={x('Pagos', 'Payments')}
        subtitle={x('Transacciones de Mercado Pago y los webhooks que confirman cada reserva automáticamente.', 'Mercado Pago transactions and the webhooks that confirm each booking automatically.')}
        actions={
          <button className="btn-primary" onClick={simulate} disabled={busy} data-trailer="btn-webhook">
            {busy ? <Spin /> : <Zap size={16} />}
            {x('Simular webhook', 'Simulate webhook')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('El huésped paga con Mercado Pago (tarjeta, débito, dinero en cuenta o efectivo).', 'Guests pay with Mercado Pago (credit, debit, account balance or cash).'),
          x('Mercado Pago avisa por webhook y la reserva se confirma sola, con WhatsApp al huésped y al dueño.', 'Mercado Pago notifies via webhook and the booking confirms itself, with WhatsApp to guest and owner.'),
          x('Si el pago no se acredita a tiempo, las fechas se liberan en todos los canales.', 'If payment doesn’t clear in time, dates are released on every channel.'),
        ]}
      />
      <DevNotice
        feature={x('Checkout y webhooks de Mercado Pago', 'Mercado Pago checkout & webhooks')}
        now={x('los pagos y webhooks son simulados con el botón “Simular webhook”.', 'payments and webhooks are simulated with the “Simulate webhook” button.')}
        later={x('se integra Checkout Pro con credenciales reales y un endpoint que valida la firma de cada notificación.', 'Checkout Pro is integrated with real credentials and an endpoint that validates each notification’s signature.')}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <KpiCard label={x('Cobrado · 30 días', 'Collected · 30 days')} value={fmtARSShort(kpis.cobrado, lang)} hint={x('{n} pagos aprobados', '{n} approved payments', { n: kpis.okCount })} icon={<CreditCard size={16} />} />
        <KpiCard label={x('Tasa de aprobación', 'Approval rate')} value={`${kpis.rate}%`} hint={x('sobre pagos cerrados', 'of settled payments')} />
        <KpiCard label={x('Pendientes', 'Pending')} value={counts.pendiente} hint={fmtARS(kpis.pendMonto, lang)} onClick={() => setFiltro('pendiente')} />
        <KpiCard label={x('Webhooks recibidos', 'Webhooks received')} value={webhooks.length} hint={x('100% respondidos con HTTP 200', '100% answered with HTTP 200')} icon={<Webhook size={16} />} />
      </div>

      <div className="mb-4 xl:hidden">
        <Segmented
          full
          value={mobileTab}
          onChange={setMobileTab}
          options={[
            { value: 'tx', label: x('Transacciones', 'Transactions'), count: pagos.length },
            { value: 'wh', label: x('Webhooks', 'Webhooks'), count: webhooks.length },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className={cn(mobileTab !== 'tx' && 'hidden xl:block')}>{txList}</div>
        <div className={cn('min-w-0', mobileTab !== 'wh' && 'hidden xl:block')}>{whPanel}</div>
      </div>
    </div>
  );
}

function payloadOf(w: WebhookLog) {
  return {
    action: w.evento,
    api_version: 'v1',
    type: 'payment',
    live_mode: false,
    date_created: w.fecha,
    data: { id: w.pagoId.replace('MP-', '') },
    _fullday: {
      external_reference: w.reservaId,
      status: w.estado === 'aprobado' ? 'approved' : w.estado === 'rechazado' ? 'rejected' : w.estado,
      signature_valid: true,
      response: w.http,
    },
  };
}
