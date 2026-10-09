import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, isSameMonth, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Wallet } from 'lucide-react';
import { Badge, Empty, KpiCard, OrigenPill, PageHeader, PagoPill, Photo, PreviewBanner } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { MARIELA_PROPS } from '@/data/selectors';
import { TODAY } from '@/data/seed';
import { cn, downloadText } from '@/lib/utils';
import { fmtARS, fmtDateTime, fmtDay, iso, locale } from '@/lib/format';
import type { Pago, Reserva } from '@/types';
import { ReservaPanel } from '@/pages/shared/ReservaDetail';

interface Row {
  r: Reserva;
  pago?: Pago;
  fecha: string;
  canal: boolean;
}

export default function OwnerCobros() {
  const { x, e, lang } = useT();
  const reservas = useApp((s) => s.reservas);
  const pagos = useApp((s) => s.pagos);
  const propiedades = useApp((s) => s.propiedades);
  const toast = useApp((s) => s.toast);
  const [month, setMonth] = useState(() => startOfMonth(TODAY));
  const [panelId, setPanelId] = useState<string | null>(null);

  const minM = addMonths(startOfMonth(TODAY), -11);
  const maxM = addMonths(startOfMonth(TODAY), 2);
  const a = iso(month);
  const z = iso(endOfMonth(month));
  const propOf = (id: string) => propiedades.find((p) => p.id === id);

  const rows: Row[] = useMemo(
    () =>
      reservas
        .filter((r) => MARIELA_PROPS.includes(r.propiedadId) && r.origen !== 'bloqueo' && r.estado !== 'cancelada' && r.checkIn >= a && r.checkIn <= z)
        .map((r) => {
          const pago = pagos.find((p) => p.reservaId === r.id);
          return { r, pago, fecha: pago?.fecha ?? r.creada, canal: r.origen !== 'fullday' };
        })
        .sort((p, q) => q.r.checkIn.localeCompare(p.r.checkIn)),
    [reservas, pagos, a, z],
  );

  const fdOk = rows.filter((w) => !w.canal && w.pago?.estado === 'aprobado');
  const fdPend = rows.filter((w) => !w.canal && w.pago?.estado === 'pendiente');
  const total = fdOk.reduce((s, w) => s + w.r.monto, 0);
  const canalTotal = rows.filter((w) => w.canal).reduce((s, w) => s + w.r.monto, 0);
  const pend = fdPend.reduce((s, w) => s + w.r.monto, 0);

  const perProp = MARIELA_PROPS.map((id) => {
    const rs = rows.filter((w) => w.r.propiedadId === id);
    const fd = rs.filter((w) => !w.canal && w.pago?.estado === 'aprobado').reduce((s, w) => s + w.r.monto, 0);
    const ch = rs.filter((w) => w.canal).reduce((s, w) => s + w.r.monto, 0);
    return { id, fd, ch, n: rs.length };
  });
  const maxProp = Math.max(1, ...perProp.map((p) => p.fd + p.ch));
  const monthLabel = format(month, 'MMMM yyyy', { locale: locale(lang) });

  const exportCsv = () => {
    const head = ['fecha', 'reserva', 'huesped', 'propiedad', 'origen', 'monto_ars', 'medio', 'estado'];
    const body = rows.map((w) => [w.fecha.slice(0, 10), w.r.id, w.r.huespedNombre, propOf(w.r.propiedadId)?.nombre ?? '', w.r.origen, String(w.r.monto), w.canal ? 'cobrado en el canal' : w.pago?.medio ?? '', w.canal ? 'canal' : w.pago?.estado ?? '']);
    downloadText(`fullday-cobros-${a.slice(0, 7)}.csv`, [head, ...body].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n'));
    toast(x('CSV de cobros de {m} descargado', '{m} payouts CSV downloaded', { m: monthLabel }));
  };

  const medio = (w: Row) =>
    w.canal ? (
      <span className="inline-flex items-center gap-1 text-ink2">
        <ExternalLink size={12} />
        {x('Cobrado en el canal', 'Collected by the channel')}
      </span>
    ) : w.pago ? (
      e('medio', w.pago.medio)
    ) : (
      '—'
    );
  const estado = (w: Row) => (w.canal ? <Badge tone={w.r.origen === 'airbnb' ? 'airbnb' : 'booking'}>{x('En {c}', 'On {c}', { c: e('origen', w.r.origen) })}</Badge> : w.pago ? <PagoPill v={w.pago.estado} /> : null);

  return (
    <>
      <PageHeader
        title={x('Cobros', 'Payouts')}
        subtitle={x('Lo que cobraste por tus casas, mes a mes. Full Day cobra con Mercado Pago; Airbnb y Booking liquidan por su cuenta.', 'What you collected for your homes, month by month. Full Day charges via Mercado Pago; Airbnb and Booking pay out on their own.')}
        actions={
          <button className="btn-secondary" onClick={exportCsv} disabled={!rows.length}>
            <Download size={16} />
            {x('Exportar CSV', 'Export CSV')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Cada pago de Mercado Pago queda asociado a su reserva, con medio y estado.', 'Each Mercado Pago payment is linked to its booking, with method and status.'),
          x('Subtotales por casa para saber cuál rinde más en el mes.', 'Per-home subtotals to see which one earns the most this month.'),
          x('Las reservas de Airbnb y Booking se listan como referencia: el cobro lo hace cada canal.', 'Airbnb and Booking reservations are listed for reference: each channel collects its own payment.'),
        ]}
      />

      <div className="mb-4 flex items-center gap-1">
        <button className="icon-btn" disabled={month <= minM} onClick={() => setMonth((m) => addMonths(m, -1))} aria-label={x('Mes anterior', 'Previous month')}>
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-[150px] text-center text-base font-semibold capitalize text-ink">{monthLabel}</div>
        <button className="icon-btn" disabled={month >= maxM} onClick={() => setMonth((m) => addMonths(m, 1))} aria-label={x('Mes siguiente', 'Next month')}>
          <ChevronRight size={18} />
        </button>
        {!isSameMonth(month, TODAY) && (
          <button className="btn-ghost btn-sm" onClick={() => setMonth(startOfMonth(TODAY))}>
            {x('Este mes', 'This month')}
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={x('Total del mes vía Full Day', 'Month total via Full Day')} value={fmtARS(total, lang)} icon={<Wallet size={16} />} hint={x('{n} pagos acreditados por Mercado Pago', '{n} payments credited by Mercado Pago', { n: fdOk.length })} />
        <KpiCard label={x('Cobrado en Airbnb y Booking', 'Collected on Airbnb & Booking')} value={fmtARS(canalTotal, lang)} hint={x('{n} reservas · lo liquida cada canal', '{n} bookings · paid out by each channel', { n: rows.filter((w) => w.canal).length })} />
        <KpiCard label={x('Pendiente de acreditar', 'Pending credit')} value={fmtARS(pend, lang)} hint={pend ? x('{n} pagos esperando a Mercado Pago', '{n} payments awaiting Mercado Pago', { n: fdPend.length }) : x('Todo acreditado', 'Everything credited')} />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {perProp.map((pp) => {
          const p = propOf(pp.id);
          return (
            <div key={pp.id} className="card min-w-0 p-4">
              <div className="flex items-center gap-3">
                <Photo src={p?.fotos[0]} alt={p?.nombre ?? ''} ratio="1/1" className="w-11 shrink-0 rounded-[8px]" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{p?.nombre}</div>
                  <div className="text-xs text-muted">{x('{n} reservas en el mes', '{n} bookings this month', { n: pp.n })}</div>
                </div>
              </div>
              <div className="num mt-3 text-xl text-ink">{fmtARS(pp.fd, lang)}</div>
              <div className="text-xs text-ink2">
                {x('vía Full Day', 'via Full Day')} · <span className="num font-medium">{fmtARS(pp.ch, lang)}</span> {x('en canales', 'on channels')}
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-subtle">
                <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${(pp.fd / maxProp) * 100}%` }} />
                <div className="h-full bg-line-strong transition-[width] duration-700" style={{ width: `${(pp.ch / maxProp) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-2 flex items-center justify-between px-1">
        <div className="section-title">{x('Detalle de cobros', 'Payout details')}</div>
        <span className="text-xs text-muted">{x('Estadías con check-in en {m}', 'Stays checking in during {m}', { m: format(month, 'MMMM', { locale: locale(lang) }) })}</span>
      </div>

      {rows.length === 0 ? (
        <Empty text={x('No hay cobros en este mes.', 'No payouts this month.')} icon={<Wallet size={20} />} />
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    <th className="th">{x('Fecha de pago', 'Payment date')}</th>
                    <th className="th">{x('Reserva', 'Booking')}</th>
                    <th className="th">{x('Huésped', 'Guest')}</th>
                    <th className="th hidden lg:table-cell">{x('Propiedad', 'Property')}</th>
                    <th className="th text-right">{x('Monto', 'Amount')}</th>
                    <th className="th">{x('Medio', 'Method')}</th>
                    <th className="th">{x('Estado', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((w) => (
                    <tr key={w.r.id} onClick={() => setPanelId(w.r.id)} className={cn('cursor-pointer transition hover:bg-subtle', w.canal && 'text-ink2')}>
                      <td className="td num whitespace-nowrap text-[13px] font-medium">{w.canal ? <span className="text-muted">{fmtDay(w.r.creada, lang)}</span> : fmtDateTime(w.fecha, lang)}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <span className="num text-[13px]">{w.r.id}</span>
                          <span className="lg:hidden">
                            <OrigenPill v={w.r.origen} />
                          </span>
                        </div>
                      </td>
                      <td className="td max-w-[180px] truncate font-medium">{w.r.huespedNombre}</td>
                      <td className="td hidden max-w-[180px] truncate text-ink2 lg:table-cell">{propOf(w.r.propiedadId)?.nombre}</td>
                      <td className={cn('td num whitespace-nowrap text-right', w.canal && 'text-ink2')}>{fmtARS(w.r.monto, lang)}</td>
                      <td className="td whitespace-nowrap text-[13px]">{medio(w)}</td>
                      <td className="td">{estado(w)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="grid gap-3 md:hidden">
            {rows.map((w) => (
              <li key={w.r.id} onClick={() => setPanelId(w.r.id)} className="card min-w-0 cursor-pointer p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="num text-xs text-ink2">{w.r.id}</div>
                    <div className="truncate font-semibold text-ink">{w.r.huespedNombre}</div>
                    <div className="truncate text-xs text-ink2">{propOf(w.r.propiedadId)?.nombre}</div>
                  </div>
                  <div className={cn('num shrink-0 text-base', w.canal ? 'text-ink2' : 'text-ink')}>{fmtARS(w.r.monto, lang)}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs">
                  <span className="text-ink2">{medio(w)}</span>
                  {estado(w)}
                </div>
                {!w.canal && <div className="num mt-1.5 text-[11px] font-normal text-muted">{fmtDateTime(w.fecha, lang)}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      <ReservaPanel id={panelId} onClose={() => setPanelId(null)} scope="propietario" />
    </>
  );
}
