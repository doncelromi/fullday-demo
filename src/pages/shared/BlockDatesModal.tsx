import { useEffect, useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { Lock } from 'lucide-react';
import { Modal, Segmented, useMedia } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { MARIELA_PROPS, bookedDays, isRangeFree } from '@/data/selectors';
import { TODAY } from '@/data/seed';
import { fmtDay, iso, locale } from '@/lib/format';

/** Bloqueo manual de fechas (se replica en Airbnb y Booking) */
export function BlockDatesModal({ open, onClose, propId, actor = 'Mariela Ruiz', propIds = MARIELA_PROPS }: { open: boolean; onClose: () => void; propId?: string; actor?: string; propIds?: string[] }) {
  const { x, lang } = useT();
  const reservas = useApp((s) => s.reservas);
  const propiedades = useApp((s) => s.propiedades);
  const bloquearFechas = useApp((s) => s.bloquearFechas);
  const toast = useApp((s) => s.toast);
  const wide = useMedia('(min-width: 768px)');
  const [prop, setProp] = useState(propId ?? propIds[0]);
  const [range, setRange] = useState<DateRange | undefined>();

  useEffect(() => {
    if (open) {
      setProp(propId ?? propIds[0]);
      setRange(undefined);
    }
  }, [open, propId, propIds]);

  const booked = useMemo(() => bookedDays(reservas, prop), [reservas, prop]);
  const from = range?.from;
  const to = range?.to ?? range?.from;
  const n = from && to ? differenceInCalendarDays(to, from) + 1 : 0;
  const checkOut = to ? iso(addDays(to, 1)) : '';
  const free = from && to ? isRangeFree(reservas, prop, iso(from), checkOut) : true;
  const name = propiedades.find((p) => p.id === prop)?.nombre ?? '';

  const confirm = () => {
    if (!from || !to || !free) return;
    bloquearFechas(prop, iso(from), checkOut, actor);
    toast(x('Fechas bloqueadas también en Airbnb y Booking · {p}, {a} → {b}', 'Dates blocked on Airbnb and Booking too · {p}, {a} → {b}', { p: name, a: fmtDay(from, lang), b: fmtDay(to, lang) }));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={wide ? 720 : 420}
      title={
        <span className="flex items-center gap-2">
          <Lock size={16} className="text-muted" />
          {x('Bloquear fechas', 'Block dates')}
        </span>
      }
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {x('Cancelar', 'Cancel')}
          </button>
          <button className="btn-primary" disabled={!n || !free} onClick={confirm}>
            {n ? x('Bloquear {n} noches', 'Block {n} nights', { n }) : x('Bloquear', 'Block')}
          </button>
        </>
      }
    >
      <div className="label">{x('Casa', 'Home')}</div>
      <Segmented
        value={prop}
        onChange={(v) => {
          setProp(v);
          setRange(undefined);
        }}
        options={propIds.map((id) => ({ value: id, label: propiedades.find((p) => p.id === id)?.nombre ?? id }))}
      />
      <div className="mt-4 flex justify-center overflow-x-auto">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={setRange}
          locale={locale(lang)}
          weekStartsOn={1}
          numberOfMonths={wide ? 2 : 1}
          fromDate={TODAY}
          toDate={addDays(TODAY, 365)}
          disabled={[...booked, { before: TODAY }]}
          modifiers={{ booked }}
          modifiersClassNames={{ booked: 'rdp-day_booked' }}
        />
      </div>
      <div className="mt-3 rounded-ctl bg-subtle px-3 py-2.5 text-[13px] text-ink2">
        {!from ? (
          x('Elegí la primera y la última noche a bloquear. Las fechas tachadas ya están reservadas.', 'Pick the first and last night to block. Struck-through dates are already booked.')
        ) : !free ? (
          <span className="font-medium text-danger">{x('El rango incluye noches ya reservadas. Elegí otras fechas.', 'The range includes nights already booked. Pick other dates.')}</span>
        ) : (
          <>
            <b className="text-ink">{name}</b> · {x('{n} noches', '{n} nights', { n })} · <span className="num">{fmtDay(from, lang)} → {fmtDay(to!, lang)}</span>
            <div className="mt-0.5 text-xs">{x('Se publica como no disponible en Full Day, Airbnb y Booking en la próxima sincronización.', 'Published as unavailable on Full Day, Airbnb and Booking on the next sync.')}</div>
          </>
        )}
      </div>
    </Modal>
  );
}
