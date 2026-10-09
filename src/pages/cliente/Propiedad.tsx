import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DayPicker, type DateRange } from 'react-day-picker';
import { parseISO } from 'date-fns';
import { ArrowLeft, Award, BedDouble, Bath, Clock, Images, MapPin, MessageCircle, PenLine, ShieldCheck, Star, Users } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { fmtARS, fmtRange, iso, locale, nights as nightsOf } from '@/lib/format';
import { propBySlug } from '@/data/properties';
import { propietarioById } from '@/data/users';
import { TODAY } from '@/data/seed';
import { bookedDays, isRangeFree } from '@/data/selectors';
import { Badge, Empty, FixedBottomBar, Modal, Photo, PreviewBanner, SuperhostBadge, useMedia } from '@/components/ui';
import { RangeField } from '@/components/RangeField';
import { ReviewList, ReviewModal, SERVICE_ICON, Stars, SyncBadge, priceUnit } from './_parts';
import MapView from './MapView';

export default function Propiedad() {
  const { slug = '' } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { x, e, b, lang } = useT();
  const base = propBySlug(slug);
  const p = useApp((s) => s.propiedades.find((q) => q.slug === slug)) ?? base;
  const reservas = useApp((s) => s.reservas);
  const allReviews = useApp((s) => s.resenas);
  const isLg = useMedia('(min-width: 1024px)');
  const [gallery, setGallery] = useState(false);
  const [review, setReview] = useState(false);
  const [guests, setGuests] = useState(Number(sp.get('g')) || 2);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const f = sp.get('from');
    const t = sp.get('to');
    return f && t ? { from: parseISO(f), to: parseISO(t) } : undefined;
  });
  const [day, setDay] = useState<Date | undefined>();
  const [slot, setSlot] = useState(0);

  const booked = useMemo(() => (p && p.tipo === 'alojamiento' ? bookedDays(reservas, p.id) : []), [reservas, p]);
  const reviews = useMemo(() => allReviews.filter((r) => r.propiedadId === p?.id), [allReviews, p]);
  const myStay = useMemo(() => reservas.find((r) => r.propiedadId === p?.id && r.huespedId === 'g-001' && r.estado === 'finalizada'), [reservas, p]);
  const alreadyReviewed = reviews.some((r) => r.autor === 'Sofía Benítez');

  if (!p) return <Empty text={x('No encontramos ese anuncio.', 'We couldn’t find that listing.')} />;
  const owner = propietarioById(p.propietarioId);
  const isExp = p.tipo === 'experiencia';
  const n = range?.from && range?.to ? nightsOf(iso(range.from), iso(range.to)) : 0;
  const minOk = n >= p.estadiaMinima;
  const free = range?.from && range?.to ? isRangeFree(reservas, p.id, iso(range.from), iso(range.to)) : true;
  const total = isExp ? p.precioNoche * guests : n * p.precioNoche;
  const slots = (p.horario ?? '').split(' · ').filter(Boolean);
  const canBook = isExp ? !!day : n > 0 && minOk && free;

  const goBook = () => {
    if (isExp) {
      const d = day ?? TODAY;
      navigate(`/reservar/${p.slug}?from=${iso(d)}&to=${iso(d)}&g=${guests}&slot=${slot}`);
    } else if (canBook) navigate(`/reservar/${p.slug}?from=${iso(range!.from!)}&to=${iso(range!.to!)}&g=${guests}`);
    else navigate(`/reservar/${p.slug}?g=${guests}`);
  };

  const bookingCard = (
    <div className="card p-5 shadow-md" data-tour="booking-card">
      <div className="flex items-baseline gap-1.5">
        <span className="num text-[22px] font-bold text-ink">{fmtARS(p.precioNoche, lang)}</span>
        <span className="text-sm text-muted">{priceUnit(p, x)}</span>
        <span className="ml-auto flex items-center gap-1 text-sm">
          <Star size={14} className="fill-accent text-accent" />
          <span className="num">{p.rating.toFixed(2)}</span>
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {isExp ? (
          <>
            <div className="text-xs font-medium text-ink2">{x('Elegí el día en el calendario', 'Pick the day on the calendar')}</div>
            <div className="input flex items-center text-sm">{day ? day.toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : <span className="text-muted">{x('Sin fecha', 'No date')}</span>}</div>
            <div className="flex flex-wrap gap-2">
              {slots.map((s, i) => (
                <button key={s} onClick={() => setSlot(i)} className={cn('min-h-[40px] rounded-full border px-3 text-sm font-medium', slot === i ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink2')}>
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <RangeField value={range} onChange={setRange} booked={booked} placeholder={x('Llegada → Salida', 'Check-in → Check-out')} />
        )}
        <div className="input flex items-center justify-between">
          <span className="text-sm text-ink2">{isExp ? x('Personas', 'People') : x('Huéspedes', 'Guests')}</span>
          <span className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-full border border-line disabled:opacity-30" disabled={guests <= 1} onClick={() => setGuests(guests - 1)} aria-label="-">
              −
            </button>
            <span className="num w-5 text-center">{guests}</span>
            <button className="flex h-8 w-8 items-center justify-center rounded-full border border-line disabled:opacity-30" disabled={guests >= p.capacidad} onClick={() => setGuests(guests + 1)} aria-label="+">
              +
            </button>
          </span>
        </div>
      </div>
      {!isExp && n > 0 && !minOk && <div className="mt-2 text-[13px] text-warn">{x('La estadía mínima es de {m} noches.', 'Minimum stay is {m} nights.', { m: p.estadiaMinima })}</div>}
      {!isExp && n > 0 && !free && <div className="mt-2 text-[13px] text-danger">{x('Esas fechas ya están ocupadas (Airbnb, Booking o Full Day).', 'Those dates are already booked (Airbnb, Booking or Full Day).')}</div>}
      {(isExp ? true : n > 0) && (
        <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between text-ink2">
            <span>{isExp ? `${fmtARS(p.precioNoche, lang)} × ${guests} ${x('personas', 'people')}` : `${fmtARS(p.precioNoche, lang)} × ${n} ${x('noches', 'nights')}`}</span>
            <span className="num">{fmtARS(total, lang)}</span>
          </div>
          <div className="flex justify-between font-semibold text-ink">
            <span>{x('Total', 'Total')}</span>
            <span className="num">{fmtARS(total, lang)}</span>
          </div>
        </div>
      )}
      <button className="btn-primary mt-4 w-full" onClick={goBook} data-trailer="btn-reservar">
        {canBook ? x('Reservar', 'Book') : isExp ? x('Elegí un día', 'Pick a day') : x('Elegir fechas y reservar', 'Choose dates and book')}
      </button>
      <p className="mt-2 text-center text-xs text-muted">{x('No se cobra nada hasta confirmar el pago con Mercado Pago.', 'Nothing is charged until you confirm with Mercado Pago.')}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1180px]">
      <Link to="/explorar" className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-ink2 hover:text-ink">
        <ArrowLeft size={16} /> {x('Volver al catálogo', 'Back to catalog')}
      </Link>
      <PreviewBanner
        bullets={[
          x('Ficha con galería, capacidad, servicios, reglas, mapa y reseñas verificadas.', 'Listing with gallery, capacity, amenities, rules, map and verified reviews.'),
          x('El calendario tacha las fechas tomadas en Airbnb, Booking y Full Day.', 'The calendar strikes out dates taken on Airbnb, Booking and Full Day.'),
          x('El total se calcula por noches y respeta la estadía mínima de cada casa.', 'Total is calculated per night and respects each home’s minimum stay.'),
        ]}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {p.superanfitrion && <SuperhostBadge />}
            {p.destacado && (
              <span className="pill bg-accent text-accent-fg">
                <Star size={11} className="fill-current" /> {x('Destacado', 'Featured')}
              </span>
            )}
            {isExp && p.categoria && <Badge tone="info">{b(p.categoria)}</Badge>}
          </div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">{p.nombre}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink2">
            <span className="flex items-center gap-1">
              <Star size={14} className="fill-accent text-accent" />
              <b className="num text-ink">{p.rating.toFixed(2)}</b> · {x('{n} reseñas', '{n} reviews', { n: p.resenas })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {p.zona} · Chacras de Coria
            </span>
          </div>
        </div>
      </div>

      {/* Galería: mosaico en desktop, carrusel con swipe en mobile */}
      <div className="relative mb-8">
        <div className="hidden h-[440px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-panel md:grid">
          {p.fotos.slice(0, 5).map((f, i) => (
            <button key={f} onClick={() => setGallery(true)} className={cn('relative overflow-hidden', i === 0 ? 'col-span-2 row-span-2' : '', p.fotos.length < 5 && i === p.fotos.length - 1 && i > 0 ? 'col-span-2' : '')}>
              <Photo src={f} alt={p.nombre} ratio="auto" className="h-full w-full transition hover:opacity-90" />
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:hidden">
          {p.fotos.map((f, i) => (
            <Photo key={f} src={f} alt={p.nombre} ratio="4/3" className="w-[86%] shrink-0 snap-center rounded-card">
              <span className="num absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">
                {i + 1}/{p.fotos.length}
              </span>
            </Photo>
          ))}
        </div>
        <button onClick={() => setGallery(true)} className="btn-secondary btn-sm absolute bottom-3 right-3 hidden md:inline-flex">
          <Images size={15} /> {x('Ver todas las fotos', 'Show all photos')}
        </button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          <section className="flex flex-wrap gap-3">
            {isExp ? (
              <>
                <Spec icon={<Clock size={18} />} label={b(p.duracion!)} />
                <Spec icon={<Users size={18} />} label={x('Hasta {n} personas', 'Up to {n} people', { n: p.capacidad })} />
                <Spec icon={<Clock size={18} />} label={p.horario ?? ''} />
              </>
            ) : (
              <>
                <Spec icon={<Users size={18} />} label={x('{n} huéspedes', '{n} guests', { n: p.capacidad })} />
                <Spec icon={<BedDouble size={18} />} label={x('{n} dormitorios', '{n} bedrooms', { n: p.dormitorios })} />
                <Spec icon={<Bath size={18} />} label={x('{n} baños', '{n} bathrooms', { n: p.banos })} />
                <Spec icon={<Clock size={18} />} label={x('Mínimo {n} noches', 'Min. {n} nights', { n: p.estadiaMinima })} />
              </>
            )}
          </section>

          <section>
            <h2 className="section-title mb-2 text-lg">{x('Sobre este lugar', 'About this place')}</h2>
            <p className="text-[15px] leading-relaxed text-ink2">{b(p.descripcion)}</p>
          </section>

          {!isExp && (
            <section>
              <h2 className="section-title mb-3 text-lg">{x('Servicios', 'Amenities')}</h2>
              <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-3">
                {p.servicios.map((s) => {
                  const Icon = SERVICE_ICON[s];
                  return (
                    <div key={s} className="flex items-center gap-2.5 rounded-ctl border border-line px-3 py-2.5 text-sm text-ink">
                      <Icon size={17} className="text-accent" /> {e('servicio', s)}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Disponibilidad sincronizada */}
          <section className="card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title text-lg">{isExp ? x('Elegí el día', 'Pick a day') : x('Disponibilidad', 'Availability')}</h2>
              <SyncBadge />
            </div>
            <div className="-mx-1 overflow-x-auto">
              {isExp ? (
                <DayPicker mode="single" locale={locale(lang)} weekStartsOn={1} numberOfMonths={isLg ? 2 : 1} selected={day} onSelect={setDay} disabled={{ before: TODAY }} fromDate={TODAY} />
              ) : (
                <DayPicker
                  mode="range"
                  locale={locale(lang)}
                  weekStartsOn={1}
                  numberOfMonths={isLg ? 2 : 1}
                  selected={range}
                  onSelect={setRange}
                  disabled={[{ before: TODAY }, ...booked]}
                  modifiers={{ booked }}
                  modifiersClassNames={{ booked: 'rdp-day_booked' }}
                  fromDate={TODAY}
                />
              )}
            </div>
            {!isExp && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink2">
                <span className="flex items-center gap-1.5">
                  <span className="line-through">14</span> {x('Ocupado (Airbnb, Booking o Full Day)', 'Booked (Airbnb, Booking or Full Day)')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-accent" /> {x('Tu selección', 'Your selection')}
                </span>
                {range?.from && range?.to && (
                  <span className="font-medium text-ink">
                    {fmtRange(iso(range.from), iso(range.to), lang)} · {x('{n} noches', '{n} nights', { n })}
                  </span>
                )}
              </div>
            )}
          </section>

          {!isExp && (
            <section>
              <h2 className="section-title mb-2 text-lg">{x('Reglas de la casa', 'House rules')}</h2>
              <ul className="grid gap-1.5 text-sm text-ink2 sm:grid-cols-2">
                <li>· {x('Check-in desde las 15:00 · Check-out hasta las 11:00', 'Check-in from 3 pm · Check-out by 11 am')}</li>
                <li>· {x('No se permiten fiestas ni eventos', 'No parties or events')}</li>
                <li>· {p.servicios.includes('pet') ? x('Se aceptan mascotas', 'Pets allowed') : x('Sin mascotas', 'No pets')}</li>
                <li>· {x('Identidad validada obligatoria para todos los huéspedes', 'Verified ID required for all guests')}</li>
              </ul>
            </section>
          )}

          <section>
            <h2 className="section-title mb-3 text-lg">{x('Ubicación', 'Location')}</h2>
            <MapView items={[p]} single className="h-[260px] overflow-hidden rounded-card border border-line sm:h-[320px]" />
            <p className="mt-2 text-xs text-muted">{x('La dirección exacta llega por WhatsApp 48 h antes del check-in.', 'The exact address arrives by WhatsApp 48 h before check-in.')}</p>
          </section>

          <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold/15 text-lg font-bold text-gold ring-2 ring-gold/50">
              {owner.nombre
                .split(' ')
                .map((w) => w[0])
                .join('')}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-ink">
                {x('Anfitrión: {n}', 'Host: {n}', { n: owner.nombre })}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink2">
                <span className="inline-flex items-center gap-1 text-gold">
                  <Award size={14} /> {x('Superanfitrión desde {y}', 'Superhost since {y}', { y: owner.superanfitrionDesde })}
                </span>
                <span>
                  · {x('Airbnb {r} ★ · {n} reseñas', 'Airbnb {r} ★ · {n} reviews', { r: p.airbnbRating.toFixed(2), n: p.airbnbResenas })}
                </span>
                <Badge tone={p.superSource === 'auto' ? 'ok' : 'neutral'}>{p.superSource === 'auto' ? x('Verificado automáticamente', 'Auto-verified') : x('Verificado por Full Day', 'Verified by Full Day')}</Badge>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => useApp.getState().toast(x('Mensaje enviado a {n}. Te responde por WhatsApp.', 'Message sent to {n}. They’ll reply on WhatsApp.', { n: owner.nombre.split(' ')[0] }), 'info')}>
              <MessageCircle size={16} /> {x('Consultar', 'Ask')}
            </button>
          </section>

          {/* Reseñas */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="num text-[34px] font-bold leading-none text-ink">{p.rating.toFixed(2)}</span>
                <div>
                  <Stars value={p.rating} size={16} />
                  <div className="text-xs text-muted">{x('{n} reseñas · huéspedes con estadía verificada', '{n} reviews · guests with verified stays', { n: p.resenas })}</div>
                </div>
              </div>
              {myStay && !alreadyReviewed ? (
                <button className="btn-primary" onClick={() => setReview(true)} data-tour="leave-review">
                  <PenLine size={16} /> {x('Dejar mi reseña', 'Leave my review')}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <ShieldCheck size={14} /> {alreadyReviewed ? x('Ya dejaste tu reseña. ¡Gracias!', 'You already reviewed. Thanks!') : x('Solo huéspedes que se alojaron pueden opinar', 'Only guests who stayed can review')}
                </span>
              )}
            </div>
            <ReviewList items={reviews} />
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[88px]">{bookingCard}</div>
        </aside>
        <div className="lg:hidden">{bookingCard}</div>
      </div>

      <FixedBottomBar dataTour="property-bar">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">{x('Desde', 'From')}</div>
          <div className="truncate">
            <span className="num font-bold text-ink">{fmtARS(p.precioNoche, lang)}</span> <span className="text-xs text-muted">{priceUnit(p, x)}</span>
          </div>
        </div>
        <button className="btn-primary" onClick={goBook}>
          {x('Reservar', 'Book')}
        </button>
      </FixedBottomBar>

      <Modal open={gallery} onClose={() => setGallery(false)} width={900} title={p.nombre}>
        <div className="grid gap-3 sm:grid-cols-2">
          {p.fotos.map((f) => (
            <Photo key={f} src={f.replace('w=1200', 'w=1600')} alt={p.nombre} ratio="4/3" className="rounded-card" />
          ))}
        </div>
      </Modal>
      <ReviewModal open={review} onClose={() => setReview(false)} prop={p} reservaId={myStay?.id} />
    </div>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex min-h-[44px] items-center gap-2 rounded-ctl border border-line bg-card px-3 text-sm text-ink">
      <span className="text-accent">{icon}</span>
      {label}
    </span>
  );
}
