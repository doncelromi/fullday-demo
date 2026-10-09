import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker, type DateRange } from 'react-day-picker';
import { CalendarDays, X } from 'lucide-react';
import { useT } from '@/i18n';
import { fmtDay, locale } from '@/lib/format';
import { TODAY } from '@/data/seed';
import { cn } from '@/lib/utils';
import { useMedia } from '@/components/ui';

/** Campo de rango de fechas con popover (react-day-picker 8) */
export function RangeField({ value, onChange, booked = [], className, placeholder, months }: { value?: DateRange; onChange: (r?: DateRange) => void; booked?: Date[]; className?: string; placeholder?: string; months?: number }) {
  const { x, lang } = useT();
  const [open, setOpen] = useState(false);
  const wide = useMedia('(min-width: 768px)');
  const label = value?.from ? `${fmtDay(value.from, lang)}${value.to ? ' → ' + fmtDay(value.to, lang) : ''}` : placeholder ?? x('¿Cuándo?', 'When?');
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={cn('input flex items-center gap-2 text-left', !value?.from && 'text-muted', className)}>
          <CalendarDays size={16} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {value?.from && (
            <span
              role="button"
              tabIndex={0}
              aria-label={x('Limpiar fechas', 'Clear dates')}
              onClick={(ev) => {
                ev.stopPropagation();
                onChange(undefined);
              }}
              className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-subtle"
            >
              <X size={14} />
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} align="start" collisionPadding={12} className="z-[90] max-w-[calc(100vw-24px)] overflow-x-auto rounded-card border border-line bg-card p-3 shadow-md">
          <DayPicker
            mode="range"
            locale={locale(lang)}
            weekStartsOn={1}
            numberOfMonths={months ?? (wide ? 2 : 1)}
            selected={value}
            onSelect={onChange}
            disabled={[{ before: TODAY }, ...booked]}
            modifiers={{ booked }}
            modifiersClassNames={{ booked: 'rdp-day_booked' }}
            fromDate={TODAY}
          />
          <div className="flex justify-end gap-2 border-t border-line pt-2">
            <button className="btn-ghost btn-sm" onClick={() => onChange(undefined)}>
              {x('Limpiar', 'Clear')}
            </button>
            <button className="btn-primary btn-sm" onClick={() => setOpen(false)}>
              {x('Listo', 'Done')}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
