import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Badge, EstadoPill, OrigenPill, PreviewBanner } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { fmtRange } from '@/lib/format';
import { ReservaDetail } from '@/pages/shared/ReservaDetail';

export default function AdminReservaDetalle() {
  const { id } = useParams();
  const { x, lang } = useT();
  const r = useApp((s) => s.reservas.find((z) => z.id === id));
  const prop = useApp((s) => s.propiedades.find((p) => p.id === r?.propiedadId));

  if (!r)
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-muted">
            <SearchX size={22} />
          </span>
          <div className="text-lg font-semibold text-ink">{x('No encontramos la reserva {id}', 'We couldn’t find booking {id}', { id: id ?? '' })}</div>
          <p className="text-sm text-ink2">{x('Puede que el código esté mal escrito o que la reserva se haya eliminado.', 'The code may be mistyped or the booking may have been removed.')}</p>
          <Link to="/admin/reservas" className="btn-primary mt-2">
            <ArrowLeft size={16} />
            {x('Volver a reservas', 'Back to bookings')}
          </Link>
        </div>
      </div>
    );

  return (
    <>
      <Link to="/admin/reservas" className="-ml-2 mb-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2 text-sm font-medium text-ink2 hover:text-ink">
        <ArrowLeft size={16} />
        {x('Reservas', 'Bookings')}
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {x('Detalle de reserva', 'Booking details')}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="num text-[24px] font-bold leading-tight tracking-tight text-ink sm:text-[28px]">{r.origen === 'bloqueo' ? x('Bloqueo', 'Block') : r.id}</h1>
            <OrigenPill v={r.origen} />
            <EstadoPill v={r.estado} />
            {r.nueva && (
              <Badge tone="accent" className="animate-pulse ring-2 ring-accent/50">
                {x('Nueva', 'New')}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm text-ink2">
            {r.origen === 'bloqueo' ? x('Bloqueo manual', 'Manual block') : r.huespedNombre} · {prop?.nombre} · <span className="num font-medium">{fmtRange(r.checkIn, r.checkOut, lang)}</span>
          </p>
        </div>
      </div>
      <PreviewBanner
        bullets={[
          x('Todo lo de una reserva en una pantalla: huésped, acompañantes, propiedad, pago e historial.', 'Everything about a booking on one screen: guest, companions, property, payment and history.'),
          x('Javier aprueba o rechaza la identidad del huésped y queda registrado quién y cuándo.', 'Javier approves or rejects the guest’s identity and who/when is logged.'),
          x('Las reservas de Airbnb y Booking se ven acá pero se gestionan en su canal.', 'Airbnb and Booking reservations show here but are managed on their channel.'),
        ]}
      />
      <ReservaDetail reserva={r} scope="admin" />
    </>
  );
}
