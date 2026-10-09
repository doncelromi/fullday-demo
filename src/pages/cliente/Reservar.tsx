import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DayPicker, type DateRange } from 'react-day-picker';
import { addMinutes, parseISO } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  ChevronDown,
  CreditCard,
  FileImage,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Smartphone,
  Timer,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { fmtARS, fmtDayLong, fmtRange, iso, locale, nights as nightsOf } from '@/lib/format';
import { propBySlug } from '@/data/properties';
import { ownerOf, TODAY } from '@/data/seed';
import { bookedDays, firstFreeWindow, isRangeFree } from '@/data/selectors';
import { DevNotice, Empty, FixedBottomBar, Photo, PreviewBanner, SuperhostBadge, useMedia } from '@/components/ui';
import type { Acompanante, MedioPago, Notificacion, Pago, Reserva } from '@/types';
import { DniSample } from './_parts';

const HOLD_MIN = 15;
type DocSide = { url?: string; sample?: boolean; name?: string };
type PayState = 'idle' | 'checkout' | 'processing' | 'approved';

export default function Reservar() {
  const { slug = '' } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { x, e, lang } = useT();
  const p = useApp((s) => s.propiedades.find((q) => q.slug === slug)) ?? propBySlug(slug);
  const reservas = useApp((s) => s.reservas);
  const isLg = useMedia('(min-width: 1024px)');
  const isExp = p?.tipo === 'experiencia';

  // ---------- Paso 1: fechas ----------
  const initial = useMemo(() => {
    const f = sp.get('from');
    const t = sp.get('to');
    if (f && t && p) return { from: f, to: t };
    if (!p) return { from: iso(TODAY), to: iso(TODAY) };
    if (p.tipo === 'experiencia') {
      const d = iso(addMinutes(TODAY, 60 * 24 * 7));
      return { from: d, to: d };
    }
    return firstFreeWindow(useApp.getState().reservas, p.id, Math.max(4, p.estadiaMinima), 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  const [range, setRange] = useState<DateRange | undefined>({ from: parseISO(initial.from), to: parseISO(initial.to) });
  const [guests, setGuests] = useState(() => Math.min(Number(sp.get('g')) || 2, p?.capacidad ?? 2));
  const [slot] = useState(Number(sp.get('slot')) || 0);
  const [step, setStep] = useState(0);
  const [holdUntil, setHoldUntil] = useState(() => Date.now() + HOLD_MIN * 60000);
  const [now, setNow] = useState(Date.now());
  const [summaryOpen, setSummaryOpen] = useState(false);

  // ---------- Paso 2: huésped ----------
  const [nombre, setNombre] = useState('Sofía Benítez');
  const [email, setEmail] = useState('sofia.benitez@gmail.com');
  const [tel, setTel] = useState('+54 9 11 5832-4417');
  const [dni, setDni] = useState('38.214.557');
  const [acomp, setAcomp] = useState<Acompanante[]>([]);

  // ---------- Paso 3: identidad ----------
  const [docTipo, setDocTipo] = useState<'dni' | 'pasaporte'>('dni');
  const [front, setFront] = useState<DocSide>({});
  const [back, setBack] = useState<DocSide>({});
  const [verify, setVerify] = useState<'idle' | 'checking' | 'done'>('idle');

  // ---------- Paso 4: pago ----------
  const [pay, setPay] = useState<PayState>('idle');
  const [medio, setMedio] = useState<MedioPago>('tarjeta');
  const [created, setCreated] = useState<Reserva | null>(null);
  const [ticks, setTicks] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const booked = useMemo(() => (p && !isExp ? bookedDays(reservas, p.id) : []), [reservas, p, isExp]);

  // Cuenta regresiva real del bloqueo temporal (hasta que se paga)
  useEffect(() => {
    if (step >= 4) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  // Acompañantes: tantos como huéspedes - 1
  useEffect(() => {
    setAcomp((a) => {
      const need = Math.max(0, guests - 1);
      if (a.length > need) return a.slice(0, need);
      return a;
    });
  }, [guests]);

  const from = range?.from ? iso(range.from) : '';
  const to = range?.to ? iso(range.to) : isExp ? from : '';
  const n = !isExp && from && to ? nightsOf(from, to) : 0;
  const minOk = isExp ? !!from : n >= (p?.estadiaMinima ?? 1);
  const free = isExp || !from || !to ? true : isRangeFree(reservas, p!.id, from, to, created?.id);
  const total = p ? (isExp ? p.precioNoche * guests : p.precioNoche * n) : 0;
  const left = Math.max(0, holdUntil - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const expired = left === 0 && step < 4;

  const startVerify = useCallback(() => {
    setVerify('checking');
    timers.current.push(window.setTimeout(() => setVerify('done'), 2000));
  }, []);

  // Al tener frente y dorso se dispara la verificación
  useEffect(() => {
    if ((front.url || front.sample) && (back.url || back.sample) && verify === 'idle') startVerify();
  }, [front, back, verify, startVerify]);

  if (!p) return <Empty text={x('No encontramos ese anuncio.', 'We couldn’t find that listing.')} />;
  const owner = ownerOf(p.id);

  const STEPS = [x('Fechas', 'Dates'), x('Huésped', 'Guest'), x('Identidad', 'Identity'), x('Pago', 'Payment'), x('Confirmación', 'Confirmation')];

  const canNext = [
    !!from && (isExp || !!to) && minOk && free,
    nombre.trim().length > 2 && dni.trim().length > 5 && acomp.every((a) => a.nombre.trim().length > 1),
    verify === 'done',
    pay === 'approved',
    true,
  ][step];

  const next = () => {
    if (!canNext) return;
    if (step === 3) return;
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back_ = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sampleDoc = () => {
    setFront({ sample: true });
    setBack({ sample: true });
  };

  const onFile = (side: 'front' | 'back', f?: File) => {
    if (!f) return;
    const v = { url: URL.createObjectURL(f), name: f.name };
    if (side === 'front') setFront(v);
    else setBack(v);
  };

  // ---------- Pago aprobado → la reserva se crea en el store compartido ----------
  const confirmPayment = () => {
    setPay('processing');
    timers.current.push(
      window.setTimeout(() => {
        const s = useApp.getState();
        const maxFd = s.reservas.reduce((m, r) => (r.id.startsWith('FD-') ? Math.max(m, Number(r.id.slice(3))) : m), 1000);
        const id = `FD-${maxFd + 1}`;
        const pagoId = `MP-${89000 + Math.floor(Math.random() * 900)}`;
        const t = new Date().toISOString();
        const res: Reserva = {
          id,
          propiedadId: p.id,
          huespedId: 'g-001',
          huespedNombre: nombre,
          origen: 'fullday',
          checkIn: from,
          checkOut: isExp ? from : to,
          huespedes: guests,
          acompanantes: acomp,
          monto: total,
          estado: 'confirmada',
          identidad: 'revision',
          pagoId,
          creada: t,
          nueva: true,
          historial: [
            { fecha: t, texto: [`Reserva creada · fechas bloqueadas ${HOLD_MIN} min`, `Booking created · dates held ${HOLD_MIN} min`], actor: nombre },
            { fecha: t, texto: [`Documento cargado (${docTipo === 'dni' ? 'DNI' : 'pasaporte'}) · validación en curso`, `Document uploaded (${docTipo === 'dni' ? 'ID' : 'passport'}) · verification in progress`], actor: nombre },
            { fecha: t, texto: ['Pago aprobado por Mercado Pago (webhook)', 'Payment approved by Mercado Pago (webhook)'], actor: 'Mercado Pago' },
            { fecha: t, texto: ['Reserva confirmada · WhatsApp enviado', 'Booking confirmed · WhatsApp sent'], actor: 'Sistema' },
            { fecha: t, texto: ['Fechas bloqueadas en Airbnb y Booking', 'Dates blocked on Airbnb and Booking'], actor: 'Sistema' },
          ],
        };
        const pago: Pago = { id: pagoId, reservaId: id, monto: total, medio, estado: 'aprobado', fecha: t };
        const notifs: Notificacion[] = [
          { id: `n-new-${id}-1`, rol: 'cliente', destinatarioId: 'g-001', destinatario: nombre, plantilla: 'confirmada', canal: 'whatsapp', estado: 'entregado', leida: false, fecha: t, texto: [`¡Listo! Tu reserva ${id} en ${p.nombre} está confirmada.`, `Done! Your booking ${id} at ${p.nombre} is confirmed.`], reservaId: id },
          { id: `n-new-${id}-2`, rol: 'propietario', destinatarioId: owner.id, destinatario: owner.nombre, plantilla: 'confirmada', canal: 'whatsapp', estado: 'entregado', leida: false, fecha: t, texto: [`Nueva reserva confirmada en ${p.nombre}: ${nombre}, ${guests} huéspedes (${id}).`, `New confirmed booking at ${p.nombre}: ${nombre}, ${guests} guests (${id}).`], reservaId: id },
          { id: `n-new-${id}-3`, rol: 'admin', destinatarioId: 'u-javier', destinatario: 'Javier Full', plantilla: 'pago', canal: 'app', estado: 'entregado', leida: false, fecha: t, texto: [`Pago acreditado ${pagoId} · ${id} · ${p.nombre}`, `Payment credited ${pagoId} · ${id} · ${p.nombre}`], reservaId: id },
        ];
        s.addReserva(res, pago);
        s.addNotifs(notifs);
        setCreated(res);
        setPay('approved');
        timers.current.push(
          window.setTimeout(() => {
            setStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            [700, 1300, 1900].forEach((ms, i) => timers.current.push(window.setTimeout(() => setTicks(i + 1), ms)));
          }, 1100),
        );
      }, 1500),
    );
  };

  /* ---------------- Resumen ---------------- */
  const summary = (
    <div className="card overflow-hidden">
      <div className="flex gap-3 p-4">
        <Photo src={p.fotos[0]} alt={p.nombre} ratio="4/3" className="w-24 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{p.nombre}</div>
          <div className="text-xs text-muted">{p.zona}</div>
          <SuperhostBadge className="mt-1.5" />
        </div>
      </div>
      <div className="space-y-2 border-t border-line p-4 text-sm">
        <Line label={isExp ? x('Día', 'Day') : x('Fechas', 'Dates')} value={from ? (isExp ? fmtDayLong(from, lang) + (p.horario ? ` · ${p.horario.split(' · ')[slot] ?? ''}` : '') : to ? fmtRange(from, to, lang) : '—') : '—'} />
        {!isExp && <Line label={x('Noches', 'Nights')} value={String(n || '—')} />}
        <Line label={isExp ? x('Personas', 'People') : x('Huéspedes', 'Guests')} value={String(guests)} />
        <Line label={isExp ? `${fmtARS(p.precioNoche, lang)} × ${guests}` : `${fmtARS(p.precioNoche, lang)} × ${n}`} value={fmtARS(total, lang)} />
      </div>
      <div className="flex items-baseline justify-between border-t border-line bg-subtle px-4 py-3">
        <span className="text-sm font-semibold text-ink">{x('Total', 'Total')}</span>
        <span className="num text-lg font-bold text-ink">{fmtARS(total, lang)}</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-ink2">
        <ShieldCheck size={14} className="shrink-0 text-ok" />
        {x('Pago protegido con Mercado Pago. Cancelación con motivo desde Mis reservas.', 'Payment protected by Mercado Pago. Cancel with a reason from My bookings.')}
      </div>
    </div>
  );

  const countdown = step < 4 && (
    <div data-trailer="countdown" className={cn('mb-5 flex items-center gap-3 rounded-card border px-4 py-3 text-sm', left < 120000 ? 'border-danger/30 bg-danger/[0.06]' : 'border-accent/30 bg-accent-soft')}>
      <Timer size={18} className={cn('shrink-0', left < 120000 ? 'text-danger' : 'text-accent')} />
      <span className="min-w-0 flex-1 text-ink">{isExp ? x('Reservamos tu lugar por', 'We’re holding your spot for') : x('Reservamos estas fechas para vos por', 'We’re holding these dates for you for')}</span>
      <span className={cn('num text-[18px] font-bold', left < 120000 ? 'text-danger' : 'text-accent')}>
        {mm}:{ss}
      </span>
    </div>
  );

  /* ---------------- Contenido por paso ---------------- */
  const stepContent = [
    // 1 · Fechas
    <div key="s1" className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">{isExp ? x('¿Qué día venís?', 'Which day are you coming?') : x('¿Cuándo venís?', 'When are you coming?')}</h2>
        <p className="mt-1 text-sm text-ink2">{isExp ? x('Elegí el día y la cantidad de personas.', 'Pick the day and number of people.') : x('Estadía mínima: {m} noches. Las fechas tachadas ya están ocupadas en Airbnb, Booking o Full Day.', 'Minimum stay: {m} nights. Struck-out dates are already booked on Airbnb, Booking or Full Day.', { m: p.estadiaMinima })}</p>
      </div>
      <div className="card -mx-1 overflow-x-auto p-3 sm:mx-0">
        {isExp ? (
          <DayPicker mode="single" locale={locale(lang)} weekStartsOn={1} numberOfMonths={isLg ? 2 : 1} selected={range?.from} onSelect={(d) => setRange(d ? { from: d, to: d } : undefined)} disabled={{ before: TODAY }} fromDate={TODAY} />
        ) : (
          <DayPicker
            mode="range"
            locale={locale(lang)}
            weekStartsOn={1}
            numberOfMonths={isLg ? 2 : 1}
            defaultMonth={range?.from}
            selected={range}
            onSelect={setRange}
            disabled={[{ before: TODAY }, ...booked]}
            modifiers={{ booked }}
            modifiersClassNames={{ booked: 'rdp-day_booked' }}
            fromDate={TODAY}
          />
        )}
      </div>
      {!isExp && n > 0 && !minOk && (
        <div className="rounded-ctl border border-warn/30 bg-warn/[0.07] px-3 py-2 text-sm text-warn" role="alert">
          {x('Elegiste {n} noche(s). {p} pide una estadía mínima de {m} noches.', 'You picked {n} night(s). {p} requires a minimum stay of {m} nights.', { n, p: p.nombre, m: p.estadiaMinima })}
        </div>
      )}
      {!free && <div className="rounded-ctl border border-danger/30 bg-danger/[0.07] px-3 py-2 text-sm text-danger">{x('Esas fechas se ocuparon en otro canal. Elegí otras.', 'Those dates were taken on another channel. Pick others.')}</div>}
      <div className="card flex items-center justify-between p-4">
        <div>
          <div className="text-sm font-semibold text-ink">{isExp ? x('Personas', 'People') : x('Huéspedes', 'Guests')}</div>
          <div className="text-xs text-muted">{x('Máximo {n}', 'Up to {n}', { n: p.capacidad })}</div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-lg disabled:opacity-30" disabled={guests <= 1} onClick={() => setGuests(guests - 1)} aria-label="-">
            −
          </button>
          <span className="num w-6 text-center text-lg">{guests}</span>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-lg disabled:opacity-30" disabled={guests >= p.capacidad} onClick={() => setGuests(guests + 1)} aria-label="+">
            +
          </button>
        </div>
      </div>
    </div>,

    // 2 · Huésped
    <div key="s2" className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">{x('Tus datos', 'Your details')}</h2>
        <p className="mt-1 text-sm text-ink2">{x('Los usamos para la confirmación por WhatsApp y para el anfitrión.', 'We use them for the WhatsApp confirmation and for the host.')}</p>
      </div>
      <div className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field label={x('Nombre y apellido', 'Full name')} value={nombre} onChange={setNombre} />
        <Field label={x('DNI / Pasaporte', 'ID / Passport')} value={dni} onChange={setDni} mono />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label={x('WhatsApp', 'WhatsApp')} value={tel} onChange={setTel} />
      </div>
      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="section-title">{x('Acompañantes', 'Companions')}</div>
            <div className="text-xs text-muted">{x('Para que el anfitrión sepa quién llega. {n} de {m}.', 'So the host knows who’s arriving. {n} of {m}.', { n: acomp.length, m: Math.max(0, guests - 1) })}</div>
          </div>
          <button className="btn-secondary btn-sm min-h-[44px]" disabled={acomp.length >= guests - 1} onClick={() => setAcomp([...acomp, { nombre: '', dni: '' }])}>
            <Plus size={15} /> {x('Agregar', 'Add')}
          </button>
        </div>
        {acomp.length === 0 && <div className="rounded-ctl border border-dashed border-line px-3 py-4 text-center text-sm text-muted">{guests > 1 ? x('Agregá a las {n} personas que vienen con vos.', 'Add the {n} people coming with you.', { n: guests - 1 }) : x('Viajás solo/a.', 'Travelling alone.')}</div>}
        <div className="space-y-2">
          {acomp.map((a, i) => (
            <div key={i} className="fade-up grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_180px_auto]">
              <input className="input" placeholder={x('Nombre y apellido', 'Full name')} value={a.nombre} onChange={(ev) => setAcomp(acomp.map((q, j) => (j === i ? { ...q, nombre: ev.target.value } : q)))} />
              <input className="input order-3 col-span-2 font-mono sm:order-none sm:col-span-1" placeholder="DNI" value={a.dni} onChange={(ev) => setAcomp(acomp.map((q, j) => (j === i ? { ...q, dni: ev.target.value } : q)))} />
              <button className="icon-btn text-danger" onClick={() => setAcomp(acomp.filter((_, j) => j !== i))} aria-label={x('Quitar', 'Remove')}>
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,

    // 3 · Identidad
    <div key="s3" className="space-y-5" data-trailer="identidad">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">{x('Validá tu identidad', 'Verify your identity')}</h2>
        <p className="mt-1 text-sm text-ink2">{x('Así el anfitrión sabe quién duerme en su casa. Se hace una sola vez y queda en tu perfil.', 'So the host knows who sleeps in their home. You only do it once and it stays on your profile.')}</p>
      </div>
      <div className="flex gap-2">
        {(['dni', 'pasaporte'] as const).map((d) => (
          <button key={d} onClick={() => setDocTipo(d)} className={cn('min-h-[44px] flex-1 rounded-ctl border px-3 text-sm font-semibold sm:flex-none', docTipo === d ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink2')}>
            {d === 'dni' ? 'DNI' : x('Pasaporte', 'Passport')}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Drop label={x('Frente', 'Front')} doc={front} side="front" onFile={(f) => onFile('front', f)} onClear={() => (setFront({}), setVerify('idle'))} />
        <Drop label={x('Dorso', 'Back')} doc={back} side="back" onFile={(f) => onFile('back', f)} onClear={() => (setBack({}), setVerify('idle'))} />
      </div>
      {verify === 'idle' && (
        <button className="btn-secondary w-full sm:w-auto" onClick={sampleDoc} data-trailer="sample-doc">
          <FileImage size={16} /> {x('Usar imagen de ejemplo', 'Use sample image')}
        </button>
      )}
      {verify === 'checking' && (
        <div className="fade-up flex items-center gap-3 rounded-card border border-info/30 bg-info/[0.06] px-4 py-3 text-sm text-info">
          <Loader2 size={18} className="animate-spin" />
          {x('Verificando documento…', 'Verifying document…')}
        </div>
      )}
      {verify === 'done' && (
        <div className="fade-up flex items-center gap-3 rounded-card border border-ok/30 bg-ok/[0.07] px-4 py-3 text-sm">
          <span className="pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ok text-white">
            <Check size={17} strokeWidth={3} />
          </span>
          <div>
            <div className="font-semibold text-ok">{x('Documento recibido · validación en curso', 'Document received · verification in progress')}</div>
            <div className="text-xs text-ink2">{x('Podés seguir: el admin lo aprueba antes del check-in.', 'You can continue: the admin approves it before check-in.')}</div>
          </div>
        </div>
      )}
      <DevNotice compact feature={x('Validación de identidad', 'Identity verification')} now={x('la verificación del documento se simula.', 'document verification is simulated.')} later={x('se valida con un proveedor (OCR + RENAPER) y el admin revisa los casos dudosos.', 'it’s verified with a provider (OCR + RENAPER) and the admin reviews edge cases.')} />
    </div>,

    // 4 · Pago
    <div key="s4" className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">{x('Pagá con Mercado Pago', 'Pay with Mercado Pago')}</h2>
        <p className="mt-1 text-sm text-ink2">{x('Cuando el pago se acredita, el webhook confirma la reserva sola.', 'When the payment clears, the webhook confirms the booking on its own.')}</p>
      </div>
      {pay === 'idle' && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink2">{x('Total a pagar', 'Total to pay')}</span>
            <span className="num text-2xl font-bold text-ink">{fmtARS(total, lang)}</span>
          </div>
          <button onClick={() => setPay('checkout')} data-trailer="btn-pagar" className="btn mt-4 w-full bg-[#009ee3] text-base text-white hover:bg-[#0089c7]">
            <Wallet size={18} /> {x('Pagar {m}', 'Pay {m}', { m: fmtARS(total, lang) })}
          </button>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
            <Lock size={12} /> {x('Te redirigimos al checkout seguro de Mercado Pago', 'You’ll go to Mercado Pago’s secure checkout')}
          </div>
        </div>
      )}
      {pay !== 'idle' && (
        <div className="fade-up overflow-hidden rounded-card border border-[#009ee3]/30 bg-card shadow-md" data-trailer="mp-checkout">
          <div className="flex items-center justify-between bg-[#009ee3] px-4 py-3 text-white">
            <span className="flex items-center gap-2 text-[15px] font-bold">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#009ee3]">MP</span>
              Mercado Pago
            </span>
            <span className="num text-sm font-semibold">{fmtARS(total, lang)}</span>
          </div>
          {pay === 'checkout' && (
            <div className="space-y-2 p-4">
              <div className="mb-1 text-sm font-semibold text-ink">{x('¿Cómo querés pagar?', 'How do you want to pay?')}</div>
              {(
                [
                  ['tarjeta', <CreditCard key="c" size={18} />, 'Visa •••• 4242'],
                  ['dinero_cuenta', <Wallet key="w" size={18} />, x('Saldo disponible', 'Available balance')],
                  ['debito', <CreditCard key="d" size={18} />, 'Maestro •••• 1180'],
                ] as [MedioPago, React.ReactNode, string][]
              ).map(([m, icon, sub]) => (
                <button key={m} onClick={() => setMedio(m)} data-trailer={`mp-${m}`} className={cn('flex min-h-[56px] w-full items-center gap-3 rounded-ctl border px-3 text-left', medio === m ? 'border-[#009ee3] bg-[#009ee3]/[0.06]' : 'border-line')}>
                  <span className="text-[#009ee3]">{icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{e('medio', m)}</span>
                    <span className="block text-xs text-muted">{sub}</span>
                  </span>
                  <span className={cn('h-5 w-5 rounded-full border-2', medio === m ? 'border-[#009ee3] bg-[#009ee3] shadow-[inset_0_0_0_3px_white]' : 'border-line-strong')} />
                </button>
              ))}
              <button onClick={confirmPayment} data-trailer="mp-confirm" className="btn mt-2 w-full bg-[#009ee3] text-white hover:bg-[#0089c7]">
                {x('Pagar', 'Pay')} {fmtARS(total, lang)}
              </button>
            </div>
          )}
          {pay === 'processing' && (
            <div className="flex flex-col items-center gap-3 p-8 text-sm text-ink2">
              <Loader2 size={30} className="animate-spin text-[#009ee3]" />
              {x('Procesando el pago…', 'Processing payment…')}
            </div>
          )}
          {pay === 'approved' && (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <span className="pop flex h-14 w-14 items-center justify-center rounded-full bg-ok text-white">
                <Check size={28} strokeWidth={3} />
              </span>
              <div className="text-lg font-bold text-ok">{x('Pago aprobado', 'Payment approved')}</div>
              <div className="text-xs text-muted">
                {created?.pagoId} · {e('medio', medio)}
              </div>
            </div>
          )}
        </div>
      )}
      <DevNotice compact feature={x('Checkout de Mercado Pago', 'Mercado Pago checkout')} now={x('el checkout y el webhook se simulan.', 'checkout and webhook are simulated.')} later={x('Checkout Pro de Mercado Pago + webhook firmado que confirma la reserva.', 'Mercado Pago Checkout Pro + a signed webhook that confirms the booking.')} />
    </div>,

    // 5 · Confirmación
    <div key="s5" className="space-y-5" data-trailer="confirmacion">
      <div className="card flex flex-col items-center p-6 text-center sm:p-8">
        <span className="pop flex h-16 w-16 items-center justify-center rounded-full bg-ok text-white shadow-md">
          <Check size={32} strokeWidth={3} />
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink">{x('¡Reserva confirmada!', 'Booking confirmed!')}</h2>
        <div className="mt-2 text-sm text-ink2">{x('Código de reserva', 'Booking code')}</div>
        <div className="num mt-1 rounded-ctl bg-subtle px-4 py-1.5 text-xl font-bold tracking-wider text-ink">{created?.id}</div>
        <div className="mt-3 text-sm text-ink2">
          {p.nombre} · {isExp ? fmtDayLong(from, lang) : fmtRange(from, to, lang)} · {x('{n} huéspedes', '{n} guests', { n: guests })}
        </div>
      </div>
      <div className="slide-in flex items-start gap-3 rounded-card border border-[#25d366]/40 bg-[#25d366]/[0.08] p-4" style={{ animationDelay: '.35s' }}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
          <Smartphone size={19} />
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-ink">📲 {x('WhatsApp enviado a {g} y a {o} (propietaria)', 'WhatsApp sent to {g} and {o} (owner)', { g: nombre.split(' ')[0], o: owner.nombre.split(' ')[0] })}</div>
          <div className="mt-1 rounded-[12px] rounded-tl-[4px] bg-card px-3 py-2 text-[13px] text-ink2 shadow-sm">
            {x('¡Listo, {g}! Tu reserva {c} en {p} está confirmada ✅', 'All set, {g}! Your booking {c} at {p} is confirmed ✅', { g: nombre.split(' ')[0], c: created?.id ?? '', p: p.nombre })}
          </div>
        </div>
      </div>
      <div className="card p-4">
        <div className="kpi-label mb-2">{x('Estado en vivo', 'Live status')}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          {(isExp ? ['Airbnb Experiences', 'Full Day'] : ['Airbnb', 'Booking', 'Full Day']).map((c, i) => (
            <span key={c} className={cn('inline-flex items-center gap-1.5 transition', ticks > i ? 'text-ok' : 'text-muted')}>
              {ticks > i ? <BadgeCheck size={17} /> : <Loader2 size={15} className="animate-spin" />}
              {isExp ? x('Cupo bloqueado en {c}', 'Spot blocked on {c}', { c }) : x('Fechas bloqueadas en {c}', 'Dates blocked on {c}', { c })} {ticks > i ? '✓' : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="btn-primary" onClick={() => navigate('/mis-reservas')}>
          {x('Ver mis reservas', 'See my bookings')} <ArrowRight size={16} />
        </button>
        <button className="btn-secondary" onClick={() => navigate('/explorar')}>
          {x('Seguir explorando', 'Keep exploring')}
        </button>
      </div>
    </div>,
  ];

  const ctaLabel = step === 3 ? (pay === 'approved' ? x('Continuar', 'Continue') : x('Pagá para continuar', 'Pay to continue')) : x('Continuar', 'Continue');

  return (
    <div className="mx-auto max-w-[1180px]">
      <Link to={`/propiedad/${p.slug}`} className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-ink2 hover:text-ink">
        <ArrowLeft size={16} /> {p.nombre}
      </Link>
      <PreviewBanner
        bullets={[
          x('Las fechas quedan bloqueadas 15 minutos en todos los canales mientras completás.', 'Dates are held for 15 minutes on every channel while you finish.'),
          x('Identidad con DNI o pasaporte (frente y dorso) antes de confirmar.', 'Identity with ID or passport (front and back) before confirming.'),
          x('El pago con Mercado Pago confirma solo y avisa por WhatsApp al huésped y al anfitrión.', 'Mercado Pago payment confirms automatically and notifies guest and host on WhatsApp.'),
        ]}
      />

      {/* Stepper */}
      <div className="mb-5">
        <div className="hidden items-center gap-2 md:flex" data-tour="stepper">
          {STEPS.map((s, i) => (
            <div key={s} className="flex min-w-0 flex-1 items-center gap-2">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition', i < step ? 'bg-ok text-white' : i === step ? 'bg-accent text-accent-fg ring-4 ring-accent/20' : 'bg-subtle text-muted')}>{i < step ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
              <span className={cn('truncate text-sm font-medium', i === step ? 'text-ink' : 'text-muted')}>{s}</span>
              {i < STEPS.length - 1 && <span className={cn('h-0.5 min-w-4 flex-1 rounded-full', i < step ? 'bg-ok' : 'bg-line')} />}
            </div>
          ))}
        </div>
        <div className="md:hidden">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">{x('Paso {a} de {b}', 'Step {a} of {b}', { a: step + 1, b: 5 })}</span>
            <span className="text-muted">{STEPS[step]}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${((step + 1) / 5) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Resumen colapsable arriba (mobile) */}
      <div className="mb-4 lg:hidden">
        <button className="card flex min-h-[52px] w-full items-center justify-between px-4 text-left" onClick={() => setSummaryOpen(!summaryOpen)} aria-expanded={summaryOpen}>
          <span className="min-w-0 truncate text-sm">
            <b className="text-ink">{p.nombre}</b> <span className="text-muted">· {from ? (isExp ? fmtDayLong(from, lang) : to ? fmtRange(from, to, lang) : '') : ''}</span>
          </span>
          <ChevronDown size={18} className={cn('shrink-0 text-muted transition', summaryOpen && 'rotate-180')} />
        </button>
        {summaryOpen && <div className="fade-up mt-2">{summary}</div>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {countdown}
          <div key={step} className="fade-up">
            {stepContent[step]}
          </div>
          {step < 4 && (
            <div className="mt-6 hidden items-center justify-between gap-2 lg:flex">
              <button className="btn-ghost" onClick={back_} disabled={step === 0}>
                <ArrowLeft size={16} /> {x('Atrás', 'Back')}
              </button>
              <button className="btn-primary min-w-[180px]" disabled={!canNext} onClick={next} data-trailer="btn-continuar">
                {ctaLabel} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-[88px] space-y-3">
            {summary}
            {verify === 'done' && (
              <div className="flex items-center gap-2 rounded-ctl border border-ok/30 bg-ok/[0.06] px-3 py-2 text-xs text-ok">
                <Camera size={14} /> {x('Documento cargado', 'Document uploaded')}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Barra fija inferior mobile: total + continuar (encima de la bottom-nav) */}
      {step < 4 && (
        <FixedBottomBar dataTour="checkout-bar">
          {step > 0 && (
            <button className="icon-btn border border-line" onClick={back_} aria-label={x('Atrás', 'Back')}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted">{x('Total', 'Total')}</div>
            <div className="num truncate font-bold text-ink">{fmtARS(total, lang)}</div>
          </div>
          <button className="btn-primary" disabled={!canNext} onClick={next}>
            {ctaLabel}
          </button>
        </FixedBottomBar>
      )}

      {expired && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[3px]">
          <div className="modal-in w-[min(420px,calc(100vw-32px))] rounded-2xl border border-line bg-card p-6 text-center shadow-md" role="dialog">
            <Timer size={28} className="mx-auto text-warn" />
            <h3 className="mt-3 text-lg font-bold text-ink">{x('Se liberaron las fechas', 'The dates were released')}</h3>
            <p className="mt-1 text-sm text-ink2">{x('Pasaron 15 minutos sin completar el pago. Podés volver a bloquearlas si siguen libres.', '15 minutes passed without payment. You can hold them again if they’re still free.')}</p>
            <button className="btn-primary mt-5 w-full" onClick={() => setHoldUntil(Date.now() + HOLD_MIN * 60000)}>
              {x('Volver a bloquear 15 min', 'Hold again for 15 min')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink2">{label}</span>
      <span className="num text-right text-ink">{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', mono }: { label: string; value: string; onChange: (v: string) => void; type?: string; mono?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <input className={cn('input', mono && 'font-mono')} type={type} value={value} onChange={(ev) => onChange(ev.target.value)} />
    </label>
  );
}

function Drop({ label, doc, side, onFile, onClear }: { label: string; doc: DocSide; side: 'front' | 'back'; onFile: (f?: File) => void; onClear: () => void }) {
  const { x } = useT();
  const [drag, setDrag] = useState(false);
  const has = doc.url || doc.sample;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink2">
        <span>{label}</span>
        {has && (
          <button className="min-h-[32px] text-danger" onClick={onClear}>
            {x('Quitar', 'Remove')}
          </button>
        )}
      </div>
      {has ? (
        <div className="fade-up relative overflow-hidden rounded-card border border-line">
          {doc.sample ? <DniSample side={side} className="rounded-none border-0" /> : <img src={doc.url} alt={label} className="aspect-[1.586] w-full object-cover" />}
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ok text-white shadow">
            <Check size={15} strokeWidth={3} />
          </span>
        </div>
      ) : (
        <label
          onDragOver={(ev) => {
            ev.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(ev) => {
            ev.preventDefault();
            setDrag(false);
            onFile(ev.dataTransfer.files?.[0]);
          }}
          className={cn('flex aspect-[1.586] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-4 text-center text-sm transition', drag ? 'border-accent bg-accent-soft' : 'border-line-strong bg-subtle hover:border-accent')}
        >
          <Upload size={22} className="text-accent" />
          <span className="font-medium text-ink">{x('Subí o arrastrá una foto', 'Upload or drop a photo')}</span>
          <span className="text-xs text-muted">{x('JPG o PNG · también podés sacarla con el celu', 'JPG or PNG · or take it with your phone')}</span>
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(ev) => onFile(ev.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}
