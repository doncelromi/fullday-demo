import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, MessageCircle, PenLine, Search, Users } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { fmtARS, fmtDateTime, fmtDayLong, fmtRange, nights } from '@/lib/format';
import { propById } from '@/data/properties';
import { ownerOf, TODAY } from '@/data/seed';
import { iso } from '@/lib/format';
import { Badge, Empty, EstadoPill, IdentidadPill, Modal, PageHeader, PagoPill, Photo, PreviewBanner, Segmented, SidePanel } from '@/components/ui';
import type { Reserva } from '@/types';
import { ReviewModal } from './_parts';

type Tab = 'proximas' | 'pasadas' | 'canceladas';

export default function MisReservas() {
  const { x, b, lang } = useT();
  const navigate = useNavigate();
  const reservas = useApp((s) => s.reservas);
  const pagos = useApp((s) => s.pagos);
  const resenas = useApp((s) => s.resenas);
  const [tab, setTab] = useState<Tab>('proximas');
  const [detail, setDetail] = useState<Reserva | null>(null);
  const [cancel, setCancel] = useState<Reserva | null>(null);
  const [review, setReview] = useState<Reserva | null>(null);
  const [motivo, setMotivo] = useState('');
  const [motivoTxt, setMotivoTxt] = useState('');

  const today = iso(TODAY);
  const mine = useMemo(() => reservas.filter((r) => r.huespedId === 'g-001'), [reservas]);
  const groups: Record<Tab, Reserva[]> = {
    proximas: mine.filter((r) => r.estado !== 'cancelada' && r.checkOut >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
    pasadas: mine.filter((r) => r.estado !== 'cancelada' && r.checkOut < today).sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
    canceladas: mine.filter((r) => r.estado === 'cancelada'),
  };
  const list = groups[tab];
  const reviewed = (r: Reserva) => resenas.some((v) => v.propiedadId === r.propiedadId && v.autor === 'Sofía Benítez');
  const live = detail ? reservas.find((r) => r.id === detail.id) ?? detail : null;

  const MOTIVOS = [x('Cambio de planes', 'Change of plans'), x('Problema con el viaje', 'Travel issue'), x('Encontré otra opción', 'Found another option'), x('Otro', 'Other')];

  const doCancel = () => {
    if (!cancel || !motivo) return;
    const m = motivo + (motivoTxt.trim() ? ` · ${motivoTxt.trim()}` : '');
    useApp.getState().cancelarReserva(cancel.id, m, 'Sofía Benítez');
    useApp.getState().toast(x('Reserva {c} cancelada. Las fechas se liberaron en todos los canales.', 'Booking {c} cancelled. Dates released on every channel.', { c: cancel.id }));
    setCancel(null);
    setMotivo('');
    setMotivoTxt('');
    setDetail(null);
  };

  return (
    <div>
      <PageHeader
        title={x('Mis reservas', 'My bookings')}
        subtitle={x('Todo en un lugar: estado, identidad, pago y el historial de cada reserva.', 'Everything in one place: status, identity, payment and each booking’s history.')}
        actions={
          <button className="btn-primary" onClick={() => navigate('/explorar')}>
            <Search size={16} /> {x('Buscar alojamiento', 'Find a stay')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Historial con estados en vivo: pendiente, confirmada, finalizada o cancelada.', 'History with live statuses: pending, confirmed, completed or cancelled.'),
          x('Cancelación con motivo: las fechas se liberan solas en Airbnb y Booking.', 'Cancel with a reason: dates are released automatically on Airbnb and Booking.'),
          x('Después de cada estadía podés dejar tu reseña con estrellas.', 'After each stay you can leave a star review.'),
        ]}
      />
      <Segmented
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'proximas', label: x('Próximas', 'Upcoming'), count: groups.proximas.length },
          { value: 'pasadas', label: x('Pasadas', 'Past'), count: groups.pasadas.length },
          { value: 'canceladas', label: x('Canceladas', 'Cancelled'), count: groups.canceladas.length },
        ]}
      />
      {list.length === 0 ? (
        <Empty text={tab === 'proximas' ? x('No tenés reservas próximas. ¿Arrancamos a buscar?', 'No upcoming bookings. Shall we start searching?') : x('Nada por acá.', 'Nothing here.')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((r) => {
            const p = propById(r.propiedadId);
            const pago = pagos.find((q) => q.id === r.pagoId);
            const isExp = p.tipo === 'experiencia';
            return (
              <article key={r.id} className={cn('card flex flex-col overflow-hidden sm:flex-row', r.nueva && 'ring-2 ring-accent')}>
                <Photo src={p.fotos[0]} alt={p.nombre} ratio="4/3" className="w-full sm:w-48 sm:shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="num text-xs text-muted">{r.id}</span>
                    {r.nueva && <Badge tone="accent">{x('Nueva', 'New')}</Badge>}
                    {isExp && <Badge tone="info">{x('Experiencia', 'Experience')}</Badge>}
                  </div>
                  <h3 className="mt-1 truncate text-base font-semibold text-ink">{p.nombre}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink2">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} /> {isExp ? fmtDayLong(r.checkIn, lang) : fmtRange(r.checkIn, r.checkOut, lang)}
                    </span>
                    {!isExp && <span>{x('{n} noches', '{n} nights', { n: nights(r.checkIn, r.checkOut) })}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Users size={14} /> {r.huespedes}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <EstadoPill v={r.estado} />
                    <IdentidadPill v={r.identidad} />
                    {pago && <PagoPill v={pago.estado} />}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                    <span className="num mr-auto text-[15px] font-bold text-ink">{fmtARS(r.monto, lang)}</span>
                    <button className="btn-secondary btn-sm min-h-[44px]" onClick={() => setDetail(r)}>
                      {x('Ver detalle', 'Details')}
                    </button>
                    {tab === 'proximas' && (
                      <button className="btn-ghost btn-sm min-h-[44px] text-danger" onClick={() => setCancel(r)}>
                        {x('Cancelar', 'Cancel')}
                      </button>
                    )}
                    {tab === 'pasadas' && r.estado === 'finalizada' && !reviewed(r) && (
                      <button className="btn-primary btn-sm min-h-[44px]" onClick={() => setReview(r)}>
                        <PenLine size={14} /> {x('Dejar reseña', 'Review')}
                      </button>
                    )}
                    {tab === 'pasadas' && reviewed(r) && <Badge tone="ok">★ {x('Reseña publicada', 'Review posted')}</Badge>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <SidePanel
        open={!!live}
        onClose={() => setDetail(null)}
        title={live ? `${live.id} · ${propById(live.propiedadId).nombre}` : ''}
        footer={
          live && live.estado !== 'cancelada' && live.checkOut >= today ? (
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => useApp.getState().toast(x('Mensaje enviado a {n} por WhatsApp.', 'Message sent to {n} on WhatsApp.', { n: ownerOf(live.propiedadId).nombre }), 'info')}>
                <MessageCircle size={16} /> {x('Escribir al anfitrión', 'Message host')}
              </button>
              <button className="btn-danger" onClick={() => setCancel(live)}>
                {x('Cancelar', 'Cancel')}
              </button>
            </div>
          ) : undefined
        }
      >
        {live && (
          <div className="space-y-5">
            <Photo src={propById(live.propiedadId).fotos[0]} alt="" ratio="16/9" className="rounded-card" />
            <div className="flex flex-wrap gap-1.5">
              <EstadoPill v={live.estado} />
              <IdentidadPill v={live.identidad} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label={x('Llegada', 'Check-in')} value={fmtDayLong(live.checkIn, lang)} />
              <Info label={x('Salida', 'Check-out')} value={fmtDayLong(live.checkOut, lang)} />
              <Info label={x('Huéspedes', 'Guests')} value={String(live.huespedes)} />
              <Info label={x('Total', 'Total')} value={fmtARS(live.monto, lang)} />
              <Info label={x('Anfitrión', 'Host')} value={ownerOf(live.propiedadId).nombre} />
              <Info label="Mercado Pago" value={live.pagoId ?? '—'} />
            </div>
            {live.motivoCancelacion && <div className="rounded-ctl bg-danger/[0.07] px-3 py-2 text-sm text-danger">{x('Motivo', 'Reason')}: {live.motivoCancelacion}</div>}
            <div>
              <div className="kpi-label mb-2">{x('Historial', 'History')}</div>
              <ol className="relative space-y-3 border-l border-line pl-4">
                {live.historial.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-accent" />
                    <div className="text-sm text-ink">{b(h.texto)}</div>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Clock size={11} /> {fmtDateTime(h.fecha, lang)} · {h.actor}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </SidePanel>

      <Modal
        open={!!cancel}
        onClose={() => setCancel(null)}
        width={440}
        title={x('Cancelar {c}', 'Cancel {c}', { c: cancel?.id ?? '' })}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCancel(null)}>
              {x('Volver', 'Back')}
            </button>
            <button className="btn-danger" disabled={!motivo} onClick={doCancel}>
              {x('Confirmar cancelación', 'Confirm cancellation')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink2">{x('Contanos el motivo. El anfitrión recibe un aviso y las fechas se liberan en Airbnb, Booking y Full Day.', 'Tell us why. The host gets notified and dates are released on Airbnb, Booking and Full Day.')}</p>
          <div className="grid gap-2">
            {MOTIVOS.map((m) => (
              <label key={m} className={cn('flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-ctl border px-3 text-sm', motivo === m ? 'border-accent bg-accent-soft' : 'border-line')}>
                <input type="radio" name="motivo" checked={motivo === m} onChange={() => setMotivo(m)} className="accent-[var(--accent)]" />
                {m}
              </label>
            ))}
          </div>
          <textarea className="input min-h-[80px] py-2" placeholder={x('Detalle (opcional)', 'Details (optional)')} value={motivoTxt} onChange={(ev) => setMotivoTxt(ev.target.value)} />
        </div>
      </Modal>

      <ReviewModal open={!!review} onClose={() => setReview(null)} prop={review ? propById(review.propiedadId) : undefined} reservaId={review?.id} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ctl bg-subtle px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="truncate font-medium text-ink">{value}</div>
    </div>
  );
}
