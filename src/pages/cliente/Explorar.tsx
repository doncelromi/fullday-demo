import { useMemo, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import type { DateRange } from 'react-day-picker';
import { List, Map as MapIcon, Minus, Plus, SlidersHorizontal, Star, X } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { fmtARS, iso } from '@/lib/format';
import { relevance, SERVICIOS } from '@/data/properties';
import { isRangeFree } from '@/data/selectors';
import { Empty, PageHeader, PreviewBanner, Segmented, Sheet, useMedia } from '@/components/ui';
import { RangeField } from '@/components/RangeField';
import type { Servicio, TipoAnuncio } from '@/types';
import { ListingCard, SERVICE_ICON, SyncBadge } from './_parts';
import MapView from './MapView';

type Orden = 'relevancia' | 'asc' | 'desc' | 'rating';

function Stepper({ value, onChange, min = 1, max = 12, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="input flex items-center justify-between gap-2 px-1.5">
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink2 disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="-">
        <Minus size={14} />
      </button>
      <span className="text-sm text-ink">{label}</span>
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink2 disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="+">
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function Explorar() {
  const { x, e, lang } = useT();
  const propiedades = useApp((s) => s.propiedades);
  const reservas = useApp((s) => s.reservas);
  const [tipo, setTipo] = useState<TipoAnuncio>('alojamiento');
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [maxPrice, setMaxPrice] = useState(320000);
  const [amen, setAmen] = useState<Servicio[]>([]);
  const [orden, setOrden] = useState<Orden>('relevancia');
  const [soloDestacados, setSoloDestacados] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showMapDesk, setShowMapDesk] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const isLg = useMedia('(min-width: 1024px)');

  const priceCap = tipo === 'alojamiento' ? 320000 : 70000;
  const cap = Math.min(maxPrice, priceCap);

  const results = useMemo(() => {
    const from = range?.from ? iso(range.from) : null;
    const to = range?.to ? iso(range.to) : null;
    const list = propiedades
      .filter((p) => p.activa && p.tipo === tipo)
      .filter((p) => p.capacidad >= guests)
      .filter((p) => p.precioNoche <= cap)
      .filter((p) => amen.every((a) => p.servicios.includes(a)))
      .filter((p) => !soloDestacados || p.destacado)
      .filter((p) => (tipo === 'alojamiento' && from && to ? isRangeFree(reservas, p.id, from, to) : true));
    const sorted = [...list];
    if (orden === 'relevancia') sorted.sort(relevance);
    if (orden === 'asc') sorted.sort((a, b) => a.precioNoche - b.precioNoche);
    if (orden === 'desc') sorted.sort((a, b) => b.precioNoche - a.precioNoche);
    if (orden === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [propiedades, reservas, tipo, guests, cap, amen, orden, range, soloDestacados]);

  const totalTipo = propiedades.filter((p) => p.tipo === tipo).length;
  const hidden = range?.from && range?.to && tipo === 'alojamiento' ? propiedades.filter((p) => p.tipo === 'alojamiento' && !isRangeFree(reservas, p.id, iso(range.from!), iso(range.to!))).length : 0;
  const query = range?.from && range?.to ? `?from=${iso(range.from)}&to=${iso(range.to)}&g=${guests}` : `?g=${guests}`;
  const activeFilters = amen.length + (maxPrice < priceCap ? 1 : 0) + (soloDestacados ? 1 : 0);

  const clear = () => {
    setAmen([]);
    setMaxPrice(320000);
    setSoloDestacados(false);
    setRange(undefined);
    setGuests(2);
  };

  const amenities = (
    <div className="flex flex-wrap gap-2">
      {SERVICIOS.map((s) => {
        const Icon = SERVICE_ICON[s];
        const on = amen.includes(s);
        return (
          <button key={s} type="button" onClick={() => setAmen(on ? amen.filter((a) => a !== s) : [...amen, s])} className={cn('inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition', on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-card text-ink2 hover:border-line-strong')} aria-pressed={on}>
            <Icon size={15} />
            {e('servicio', s)}
          </button>
        );
      })}
    </div>
  );

  const priceSlider = (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-ink2">{tipo === 'alojamiento' ? x('Precio máximo por noche', 'Max price per night') : x('Precio máximo por persona', 'Max price per person')}</span>
        <span className="num text-ink">{fmtARS(cap, lang)}</span>
      </div>
      <Slider.Root className="relative flex h-11 w-full touch-none select-none items-center" value={[cap]} min={tipo === 'alojamiento' ? 90000 : 30000} max={priceCap} step={5000} onValueChange={([v]) => setMaxPrice(v)} aria-label="precio">
        <Slider.Track className="relative h-1.5 grow rounded-full bg-subtle">
          <Slider.Range className="absolute h-full rounded-full bg-accent" />
        </Slider.Track>
        <Slider.Thumb className="block h-6 w-6 rounded-full border-2 border-accent bg-card shadow-md outline-none focus:ring-4 focus:ring-accent/25" />
      </Slider.Root>
    </div>
  );

  const destToggle = (
    <button type="button" onClick={() => setSoloDestacados(!soloDestacados)} className={cn('inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium', soloDestacados ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-card text-ink2')} aria-pressed={soloDestacados}>
      <Star size={14} className={soloDestacados ? 'fill-current' : ''} />
      {x('Solo destacados', 'Featured only')}
    </button>
  );

  const showMap = isLg ? showMapDesk : view === 'map';

  return (
    <div>
      <PageHeader
        title={x('Casas de Superanfitriones en Chacras de Coria', 'Superhost homes in Chacras de Coria')}
        subtitle={x('Solo anfitriones con reputación comprobada en Airbnb. Disponibilidad real, sincronizada con Airbnb y Booking.', 'Only hosts with proven Airbnb reputation. Real availability, synced with Airbnb and Booking.')}
        actions={<SyncBadge />}
      />
      <PreviewBanner
        bullets={[
          x('Destacados primero y badge de Superanfitrión automático según la reputación en Airbnb.', 'Featured first and an automatic Superhost badge based on Airbnb reputation.'),
          x('Al elegir fechas solo ves casas realmente libres en Full Day, Airbnb y Booking.', 'Pick dates and you only see homes truly free on Full Day, Airbnb and Booking.'),
          x('Alojamientos y experiencias de la zona: bodegas, cabalgatas, cocina cuyana.', 'Stays and local experiences: wineries, horseback rides, regional cooking.'),
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={tipo}
          onChange={(v) => {
            setTipo(v);
            setMaxPrice(320000);
            setAmen([]);
          }}
          options={[
            { value: 'alojamiento', label: x('Alojamientos', 'Stays'), count: propiedades.filter((p) => p.tipo === 'alojamiento').length },
            { value: 'experiencia', label: x('Experiencias', 'Experiences'), count: propiedades.filter((p) => p.tipo === 'experiencia').length },
          ]}
        />
      </div>

      {/* Buscador */}
      <section className="card mb-5 p-3 sm:p-4" data-trailer="buscador">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <RangeField value={range} onChange={setRange} placeholder={tipo === 'alojamiento' ? x('Llegada → Salida', 'Check-in → Check-out') : x('¿Qué día?', 'Which day?')} />
          <Stepper value={guests} onChange={setGuests} max={10} label={x('{n} huéspedes', '{n} guests', { n: guests })} />
          <select className="input" value={orden} onChange={(ev) => setOrden(ev.target.value as Orden)} aria-label={x('Ordenar', 'Sort')}>
            <option value="relevancia">{x('Orden: relevancia (destacados primero)', 'Sort: relevance (featured first)')}</option>
            <option value="asc">{x('Precio: menor a mayor', 'Price: low to high')}</option>
            <option value="desc">{x('Precio: mayor a menor', 'Price: high to low')}</option>
            <option value="rating">{x('Mejor puntuadas', 'Top rated')}</option>
          </select>
          <button className="btn-secondary lg:hidden" onClick={() => setSheet(true)}>
            <SlidersHorizontal size={16} />
            {x('Filtros', 'Filters')}
            {activeFilters > 0 && <span className="num rounded-full bg-accent px-1.5 text-[11px] text-accent-fg">{activeFilters}</span>}
          </button>
          <button className="btn-secondary hidden lg:inline-flex" onClick={() => setShowMapDesk(!showMapDesk)}>
            {showMapDesk ? <List size={16} /> : <MapIcon size={16} />}
            {showMapDesk ? x('Ocultar mapa', 'Hide map') : x('Ver mapa', 'Show map')}
          </button>
        </div>
        <div className="mt-3 hidden gap-4 border-t border-line pt-3 lg:grid lg:grid-cols-[1fr_300px]">
          <div className="flex flex-wrap gap-2">
            {destToggle}
            {amenities}
          </div>
          {priceSlider}
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-ink2">
          {x('{n} de {t} {k}', '{n} of {t} {k}', { n: results.length, t: totalTipo, k: tipo === 'alojamiento' ? x('alojamientos', 'stays') : x('experiencias', 'experiences') })}
          {hidden > 0 && <span className="text-muted"> · {x('{h} ocupadas en esas fechas', '{h} booked on those dates', { h: hidden })}</span>}
        </span>
        {(activeFilters > 0 || range) && (
          <button className="inline-flex min-h-[36px] items-center gap-1 text-[13px] font-medium text-accent" onClick={clear}>
            <X size={14} />
            {x('Limpiar filtros', 'Clear filters')}
          </button>
        )}
      </div>

      <div className={cn('grid gap-5', showMap && isLg && 'lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_480px]')}>
        {(!showMap || isLg) && (
          <div>
            {results.length === 0 ? (
              <Empty text={x('No hay resultados con estos filtros. Probá con otras fechas o menos comodidades.', 'No results with these filters. Try other dates or fewer amenities.')} />
            ) : (
              <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', showMap && isLg ? 'xl:grid-cols-2' : 'lg:grid-cols-3')}>
                {results.map((p) => (
                  <ListingCard key={p.id} p={p} active={hover === p.id} onHover={setHover} query={query} />
                ))}
              </div>
            )}
          </div>
        )}
        {showMap && (
          <div className={cn(isLg ? 'sticky top-[84px] h-[calc(100dvh-110px)]' : 'h-[min(70dvh,560px)]')}>
            <MapView items={results} activeId={hover} className="h-full w-full overflow-hidden rounded-card border border-line" />
          </div>
        )}
      </div>

      {/* Toggle lista / mapa (mobile y tablet) */}
      <div className="pointer-events-none sticky z-30 mt-4 flex justify-center lg:hidden" style={{ bottom: 'calc(var(--fixed-bottom-stack) + 14px)' }}>
        <button onClick={() => setView(view === 'list' ? 'map' : 'list')} className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy-deep px-5 text-sm font-semibold text-white shadow-md dark:bg-card dark:text-ink">
          {view === 'list' ? <MapIcon size={16} /> : <List size={16} />}
          {view === 'list' ? x('Ver mapa', 'Show map') : x('Ver lista', 'Show list')}
        </button>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title={x('Filtros', 'Filters')}>
        <div className="space-y-5 pb-2">
          {priceSlider}
          <div>
            <div className="label">{x('Comodidades', 'Amenities')}</div>
            {amenities}
          </div>
          <div>{destToggle}</div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={clear}>
              {x('Limpiar', 'Clear')}
            </button>
            <button className="btn-primary flex-1" onClick={() => setSheet(false)}>
              {x('Ver {n} resultados', 'Show {n} results', { n: results.length })}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
