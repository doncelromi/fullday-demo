import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { propById } from '@/data/properties';
import { fmtARS, fmtRange } from '@/lib/format';
import type { Reserva } from '@/types';

type MotivoKey = 'huesped' | 'pago' | 'fuerza' | 'otro';

const MOTIVOS: { key: MotivoKey; es: string; en: string }[] = [
  { key: 'huesped', es: 'Pedido del huésped', en: 'Guest request' },
  { key: 'pago', es: 'Pago no acreditado', en: 'Payment not credited' },
  { key: 'fuerza', es: 'Fuerza mayor', en: 'Force majeure' },
  { key: 'otro', es: 'Otro', en: 'Other' },
];

/** Modal de cancelación: motivo + detalle → store.cancelarReserva + toast */
export function CancelModal({ reserva, open, onClose, actor, onDone }: { reserva: Reserva | null; open: boolean; onClose: () => void; actor: string; onDone?: () => void }) {
  const { x, lang } = useT();
  const cancelarReserva = useApp((s) => s.cancelarReserva);
  const toast = useApp((s) => s.toast);
  const [motivo, setMotivo] = useState<MotivoKey>('huesped');
  const [texto, setTexto] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivo('huesped');
      setTexto('');
      setTouched(false);
    }
  }, [open]);

  if (!reserva) return null;
  const prop = propById(reserva.propiedadId);
  const needText = motivo === 'otro' && !texto.trim();
  const isBlock = reserva.origen === 'bloqueo';

  const confirm = () => {
    setTouched(true);
    if (needText) return;
    const m = MOTIVOS.find((k) => k.key === motivo)!;
    const label = lang === 'es' ? m.es : m.en;
    cancelarReserva(reserva.id, texto.trim() ? `${label} · ${texto.trim()}` : label, actor);
    toast(
      isBlock
        ? x('Bloqueo liberado · {prop} vuelve a estar disponible en todos los canales', 'Block released · {prop} is available again on every channel', { prop: prop.nombre })
        : x('Reserva {id} cancelada · fechas liberadas en Full Day, Airbnb y Booking', 'Booking {id} cancelled · dates released on Full Day, Airbnb and Booking', { id: reserva.id }),
      'warn',
    );
    onClose();
    onDone?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isBlock ? x('Liberar fechas bloqueadas', 'Release blocked dates') : x('Cancelar reserva {id}', 'Cancel booking {id}', { id: reserva.id })}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {x('Volver', 'Go back')}
          </button>
          <button className="btn-danger" onClick={confirm}>
            {isBlock ? x('Liberar fechas', 'Release dates') : x('Confirmar cancelación', 'Confirm cancellation')}
          </button>
        </>
      }
    >
      <div className="flex gap-3 rounded-ctl border border-danger/25 bg-danger/[0.06] p-3 text-[13px]">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 text-ink2">
          <div className="font-semibold text-ink">
            {prop.nombre} · <span className="num font-medium">{fmtRange(reserva.checkIn, reserva.checkOut, lang)}</span>
          </div>
          <div className="mt-0.5">
            {isBlock
              ? x('Las fechas se liberan en Full Day y se publican como disponibles en Airbnb y Booking.', 'Dates are released on Full Day and published as available on Airbnb and Booking.')
              : x('{guest} recibe un WhatsApp con la cancelación y las fechas se liberan en todos los canales.', '{guest} gets a WhatsApp with the cancellation and the dates are released on every channel.', { guest: reserva.huespedNombre })}
            {reserva.monto > 0 && (
              <>
                {' '}
                {x('Monto de la reserva:', 'Booking amount:')} <span className="num text-ink">{fmtARS(reserva.monto, lang)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <label className="label mt-4" htmlFor="cm-motivo">
        {x('Motivo', 'Reason')}
      </label>
      <select id="cm-motivo" className="input" value={motivo} onChange={(ev) => setMotivo(ev.target.value as MotivoKey)}>
        {MOTIVOS.map((m) => (
          <option key={m.key} value={m.key}>
            {lang === 'es' ? m.es : m.en}
          </option>
        ))}
      </select>

      <label className="label mt-4" htmlFor="cm-texto">
        {x('Detalle', 'Details')} {motivo !== 'otro' && <span className="text-muted">({x('opcional', 'optional')})</span>}
      </label>
      <textarea
        id="cm-texto"
        rows={3}
        className="input py-2.5"
        value={texto}
        onChange={(ev) => setTexto(ev.target.value)}
        placeholder={x('Ej.: el huésped avisó por WhatsApp que no puede viajar', 'E.g.: the guest said on WhatsApp they can’t travel')}
      />
      {touched && needText && <p className="mt-1.5 text-xs text-danger">{x('Contanos el motivo para dejarlo registrado en el historial.', 'Tell us the reason so it’s logged in the history.')}</p>}
    </Modal>
  );
}
