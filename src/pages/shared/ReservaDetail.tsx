import { useState, type ReactNode } from 'react';
import { CheckCircle2, Copy, CreditCard, ExternalLink, History, Home, ScanFace, Lock, Mail, MapPin, Phone, Users, X as XIcon, XCircle } from 'lucide-react';
import { Badge, DevNotice, EstadoPill, IdentidadPill, Modal, OrigenPill, PagoPill, Photo, SidePanel } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { huespedById } from '@/data/users';
import { cn } from '@/lib/utils';
import { fmtARS, fmtDateTime, fmtDayLong, fmtRelative, iso, nights } from '@/lib/format';
import type { Reserva, User } from '@/types';
import { CancelModal } from './CancelModal';
import { TODAY } from '@/data/seed';

export type Scope = 'admin' | 'propietario';
export const ACTOR: Record<Scope, string> = { admin: 'Javier Full', propietario: 'Mariela Ruiz' };

/** ¿Se puede cancelar desde Full Day? (las importadas se gestionan en su canal) */
export const canCancel = (r: Reserva) => (r.origen === 'fullday' || r.origen === 'bloqueo') && (r.estado === 'pendiente' || r.estado === 'confirmada') && r.checkOut > iso(TODAY);

/* ---------------- Documento de identidad de muestra (SVG, datos ficticios) ---------------- */
const FEMALE = new Set(['Sofía', 'Agustina', 'Camila', 'Hannah', 'Martina', 'Valentina', 'Florencia', 'Julieta', 'Carolina', 'Emma', 'Paula', 'Isidora', 'Lara']);

function docInfo(guest: User | undefined, nombre: string) {
  const doc = guest?.documento ?? 'DNI 38.214.557';
  const digits = doc.replace(/\D/g, '').padEnd(8, '7');
  const parts = nombre.split(' ');
  const first = parts[0] ?? '';
  const last = parts.slice(1).join(' ') || first;
  const d = Number(digits.slice(0, 2));
  const kind: 'dni' | 'rut' | 'pass' = doc.startsWith('DNI') ? 'dni' : doc.startsWith('RUT') ? 'rut' : 'pass';
  const country = guest?.pais ?? 'AR';
  return {
    kind,
    number: doc.replace(/^(DNI|RUT|Pass\.)\s*/, ''),
    first,
    last,
    sex: FEMALE.has(first) ? 'F' : 'M',
    birth: `${String((d % 28) + 1).padStart(2, '0')}/${String((Number(digits[2]) % 12) + 1).padStart(2, '0')}/${1984 + (Number(digits.slice(3, 5)) % 16)}`,
    digits,
    country,
    nat: country === 'AR' ? 'ARGENTINA' : country === 'CL' ? 'CHILENA' : country === 'BR' ? 'BRASILEÑA' : 'ALEMANA',
    header:
      kind === 'dni'
        ? ['REPÚBLICA ARGENTINA · MERCOSUR', 'REGISTRO NACIONAL DE LAS PERSONAS', 'DOCUMENTO NACIONAL DE IDENTIDAD']
        : kind === 'rut'
          ? ['REPÚBLICA DE CHILE', 'SERVICIO DE REGISTRO CIVIL E IDENTIFICACIÓN', 'CÉDULA DE IDENTIDAD']
          : [country === 'BR' ? 'REPÚBLICA FEDERATIVA DO BRASIL' : 'BUNDESREPUBLIK DEUTSCHLAND', 'PASAPORTE · PASSPORT', 'DOCUMENTO DE VIAJE'],
  };
}

function Watermark() {
  return (
    <g transform="rotate(-24 170 107)" opacity="0.5">
      <text x="170" y="122" textAnchor="middle" fontSize="46" fontWeight="800" letterSpacing="8" fill="#dc2626" fontFamily="Inter, sans-serif" opacity="0.55">
        MUESTRA
      </text>
    </g>
  );
}

function Guilloche({ id, tint }: { id: string; tint: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tint} />
          <stop offset="55%" stopColor="#eef3f8" />
          <stop offset="100%" stopColor="#e8efe0" />
        </linearGradient>
        <clipPath id={`c-${id}`}>
          <rect width="340" height="214" rx="12" />
        </clipPath>
      </defs>
      <rect width="340" height="214" rx="12" fill={`url(#g-${id})`} />
      <g clipPath={`url(#c-${id})`} fill="none" stroke="#7aa2c4" strokeWidth="0.5" opacity="0.35">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${30 + i * 20} Q 85 ${10 + i * 20} 170 ${30 + i * 20} T 340 ${30 + i * 20}`} />
        ))}
        <circle cx="290" cy="150" r="46" />
        <circle cx="290" cy="150" r="36" />
        <circle cx="290" cy="150" r="26" />
      </g>
      <rect x="0.5" y="0.5" width="339" height="213" rx="12" fill="none" stroke="#9fb6cc" />
    </>
  );
}

export function IdDocFront({ guest, nombre }: { guest?: User; nombre: string }) {
  const d = docInfo(guest, nombre);
  return (
    <svg viewBox="0 0 340 214" className="h-auto w-full" role="img" aria-label="Documento de muestra (frente)">
      <Guilloche id="f" tint={d.kind === 'pass' ? '#dfe5f3' : '#d8e8f4'} />
      <circle cx="312" cy="26" r="11" fill="#f5c542" opacity="0.9" />
      <circle cx="312" cy="26" r="5" fill="#e0a917" />
      <text x="16" y="22" fontSize="9.5" fontWeight="800" fill="#1e3a5f" fontFamily="Inter, sans-serif">{d.header[0]}</text>
      <text x="16" y="33" fontSize="6.5" fontWeight="600" fill="#45617d" fontFamily="Inter, sans-serif">{d.header[1]}</text>
      <text x="16" y="44" fontSize="7" fontWeight="700" fill="#1e3a5f" fontFamily="Inter, sans-serif" letterSpacing="0.6">{d.header[2]}</text>
      {/* foto */}
      <rect x="16" y="54" width="76" height="96" rx="6" fill="#c9d3dd" />
      <circle cx="54" cy="88" r="17" fill="#8a9aab" />
      <path d="M24 150 C 26 120, 82 120, 84 150 Z" fill="#8a9aab" />
      {/* campos */}
      {[
        ['Apellido / Surname', d.last.toUpperCase()],
        ['Nombre / Name', d.first.toUpperCase()],
        ['Sexo / Sex', d.sex],
        ['Nacionalidad / Nationality', d.nat],
        ['Fecha de nacimiento / Date of birth', d.birth],
      ].map(([l, v], i) => (
        <g key={l} transform={`translate(104 ${62 + i * 19})`}>
          <text fontSize="5.4" fill="#5b7088" fontFamily="Inter, sans-serif">{l}</text>
          <text y="9" fontSize="8.2" fontWeight="700" fill="#0f2238" fontFamily="Inter, sans-serif">{v}</text>
        </g>
      ))}
      <text x="16" y="168" fontSize="5.4" fill="#5b7088" fontFamily="Inter, sans-serif">{d.kind === 'pass' ? 'Pasaporte N° / Passport No.' : 'Documento / Document'}</text>
      <text x="16" y="183" fontSize="13" fontWeight="800" fill="#0f2238" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{d.number}</text>
      <path d="M200 182 c 8 -14, 14 6, 22 -6 s 10 8, 18 -2 s 8 4, 16 -4" fill="none" stroke="#1e3a5f" strokeWidth="1.2" />
      <text x="200" y="196" fontSize="5" fill="#5b7088" fontFamily="Inter, sans-serif">Firma / Signature</text>
      <Watermark />
    </svg>
  );
}

export function IdDocBack({ guest, nombre }: { guest?: User; nombre: string }) {
  const d = docInfo(guest, nombre);
  const cc = d.country === 'AR' ? 'ARG' : d.country === 'CL' ? 'CHL' : d.country === 'BR' ? 'BRA' : 'D<<';
  const pad = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '<');
  const mrz = [pad(`ID${cc}${d.digits.slice(0, 8)}<${d.digits[0]}`, 30), pad(`${d.birth.slice(8)}${d.birth.slice(3, 5)}${d.birth.slice(0, 2)}${d.digits[1]}${d.sex}3104157${cc}`, 29) + '6', pad(`${norm(d.last)}<<${norm(d.first)}`, 30)];
  const bars = Array.from({ length: 64 }, (_, i) => ((Number(d.digits[i % 8]) + i * 7) % 5) + 1);
  return (
    <svg viewBox="0 0 340 214" className="h-auto w-full" role="img" aria-label="Documento de muestra (dorso)">
      <Guilloche id="b" tint="#e3ecf5" />
      <text x="16" y="22" fontSize="5.4" fill="#5b7088" fontFamily="Inter, sans-serif">Domicilio / Address</text>
      <text x="16" y="32" fontSize="7.4" fontWeight="700" fill="#0f2238" fontFamily="Inter, sans-serif">AV. SIEMPRE VIVA 742 · MUESTRA</text>
      <text x="16" y="48" fontSize="5.4" fill="#5b7088" fontFamily="Inter, sans-serif">Fecha de emisión / Date of issue</text>
      <text x="16" y="58" fontSize="7.4" fontWeight="700" fill="#0f2238" fontFamily="Inter, sans-serif">15/04/2021</text>
      {/* código de barras tipo PDF417 */}
      <g transform="translate(16 70)">
        {bars.map((w, i) => (
          <rect key={i} x={i * 3.2} y="0" width={w * 0.55} height="44" fill="#1e293b" />
        ))}
      </g>
      {/* huella */}
      <g transform="translate(286 82)" fill="none" stroke="#64748b" strokeWidth="0.8">
        {[6, 10, 14, 18, 22].map((r) => (
          <ellipse key={r} rx={r * 0.8} ry={r} />
        ))}
      </g>
      <rect x="0" y="140" width="340" height="62" fill="#f8fafc" opacity="0.75" />
      {mrz.map((l, i) => (
        <text key={i} x="16" y={158 + i * 15} fontSize="10.4" fontFamily="JetBrains Mono, monospace" fill="#0f172a" letterSpacing="0.4">
          {l}
        </text>
      ))}
      <Watermark />
    </svg>
  );
}

/* ---------------- Bloques ---------------- */
function Block({ title, icon, children, right, className }: { title: string; icon: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={cn('card min-w-0 p-4 sm:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="text-muted">{icon}</span>
          {title}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={cn('mt-0.5 truncate text-sm text-ink', mono && 'num')}>{children}</div>
    </div>
  );
}

function ImportNotice({ r }: { r: Reserva }) {
  const { x, e } = useT();
  if (r.origen === 'bloqueo')
    return (
      <div className="flex gap-3 rounded-card border border-line bg-subtle p-4 text-[13px] text-ink2">
        <Lock size={18} className="mt-0.5 shrink-0 text-muted" />
        <div>
          <div className="font-semibold text-ink">{x('Bloqueo manual de fechas', 'Manual date block')}</div>
          {x('Las noches figuran como no disponibles en Full Day, Airbnb y Booking. No hay huésped ni cobro asociado.', 'The nights show as unavailable on Full Day, Airbnb and Booking. No guest or payment attached.')}
        </div>
      </div>
    );
  return (
    <div className={cn('flex gap-3 rounded-card border p-4 text-[13px] text-ink2', r.origen === 'airbnb' ? 'border-airbnb/25 bg-airbnb/[0.05]' : 'border-booking/25 bg-booking/[0.05]')}>
      <ExternalLink size={18} className={cn('mt-0.5 shrink-0', r.origen === 'airbnb' ? 'text-airbnb' : 'text-booking')} />
      <div>
        <div className="font-semibold text-ink">{x('Reserva importada vía iCal — se gestiona en el canal de origen', 'Booking imported via iCal — managed on its source channel')}</div>
        {x('El cobro, la identidad del huésped y las cancelaciones se resuelven en {canal}. Full Day bloquea las fechas en el resto de los canales automáticamente.', 'Payment, guest identity and cancellations are handled on {canal}. Full Day blocks the dates on the other channels automatically.', { canal: e('origen', r.origen) })}
      </div>
    </div>
  );
}

function Timeline({ r }: { r: Reserva }) {
  const { b, lang } = useT();
  const items = [...r.historial].sort((a, c) => a.fecha.localeCompare(c.fecha));
  return (
    <ol className="relative ml-1.5 border-l border-line pl-5">
      {items.map((h, i) => {
        const last = i === items.length - 1;
        const txt = b(h.texto);
        const tone = /cancel|rechaz|reject/i.test(txt) ? 'bg-danger' : /aprob|confirm|validad|verified|approved/i.test(txt) ? 'bg-ok' : 'bg-line-strong';
        return (
          <li key={i} className="relative pb-4 last:pb-0">
            <span className={cn('absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card', last ? 'bg-accent shadow-[0_0_0_3px_var(--accent-ring)]' : tone)} />
            <div className={cn('text-sm', last ? 'font-semibold text-ink' : 'text-ink')}>{txt}</div>
            <div className="mt-0.5 text-xs text-muted">
              <span className="num font-medium">{fmtDateTime(h.fecha, lang)}</span> · {h.actor}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function IdentityBlock({ r, scope }: { r: Reserva; scope: Scope }) {
  const { x, e } = useT();
  const setIdentidad = useApp((s) => s.setIdentidad);
  const toast = useApp((s) => s.toast);
  const [zoom, setZoom] = useState<'front' | 'back' | null>(null);
  const guest = huespedById(r.huespedId);
  const act = (v: 'validada' | 'rechazada') => {
    setIdentidad(r.id, v, ACTOR[scope]);
    toast(
      v === 'validada'
        ? x('Identidad de {g} aprobada · se registró en el historial', 'Identity of {g} approved · logged in the history', { g: r.huespedNombre })
        : x('Identidad rechazada · le pedimos a {g} un nuevo documento por WhatsApp', 'Identity rejected · we asked {g} for a new document via WhatsApp', { g: r.huespedNombre }),
      v === 'validada' ? 'ok' : 'warn',
    );
  };
  return (
    <Block title={x('Identidad', 'Identity')} icon={<ScanFace size={16} />} right={<IdentidadPill v={r.identidad} />}>
      {scope === 'admin' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['front', 'back'] as const).map((side) => (
              <button key={side} type="button" onClick={() => setZoom(side)} className="group overflow-hidden rounded-ctl border border-line bg-subtle p-1.5 text-left transition hover:border-line-strong">
                {side === 'front' ? <IdDocFront guest={guest} nombre={r.huespedNombre} /> : <IdDocBack guest={guest} nombre={r.huespedNombre} />}
                <div className="px-1 pb-0.5 pt-1.5 text-xs text-ink2">{side === 'front' ? x('Frente · tocá para ampliar', 'Front · tap to enlarge') : x('Dorso · tocá para ampliar', 'Back · tap to enlarge')}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary btn-sm flex-1 sm:flex-none" disabled={r.identidad === 'validada'} onClick={() => act('validada')}>
              <CheckCircle2 size={16} />
              {x('Aprobar', 'Approve')}
            </button>
            <button className="btn-secondary btn-sm flex-1 text-danger sm:flex-none" disabled={r.identidad === 'rechazada'} onClick={() => act('rechazada')}>
              <XCircle size={16} />
              {x('Rechazar', 'Reject')}
            </button>
          </div>
          <DevNotice
            compact
            className="mt-3"
            feature={x('Validación de identidad', 'Identity verification')}
            now={x('se muestran documentos de muestra.', 'sample documents are shown.')}
            later={x('validación automática del DNI/pasaporte con un proveedor (ej. RENAPER / OCR) y revisión manual.', 'automatic ID/passport verification with a provider (e.g. RENAPER / OCR) plus manual review.')}
          />
          <Modal open={zoom !== null} onClose={() => setZoom(null)} width={640} title={`${guest?.documento ?? ''} · ${zoom === 'back' ? x('Dorso', 'Back') : x('Frente', 'Front')}`}>
            {zoom === 'back' ? <IdDocBack guest={guest} nombre={r.huespedNombre} /> : <IdDocFront guest={guest} nombre={r.huespedNombre} />}
            <p className="mt-3 text-xs text-muted">{x('Documento ficticio generado para la demo. Estado actual: {s}.', 'Fictitious document generated for the demo. Current status: {s}.', { s: e('identidad', r.identidad) })}</p>
          </Modal>
        </>
      ) : (
        <p className="text-[13px] text-ink2">
          {r.identidad === 'validada'
            ? x('Full Day verificó el documento del huésped antes de confirmar la reserva.', 'Full Day verified the guest’s ID before confirming the booking.')
            : x('El equipo de Full Day está revisando el documento del huésped.', 'The Full Day team is reviewing the guest’s ID.')}
        </p>
      )}
    </Block>
  );
}

function PaymentBlock({ r }: { r: Reserva }) {
  const { x, e, lang } = useT();
  const pago = useApp((s) => s.pagos.find((p) => p.reservaId === r.id));
  const toast = useApp((s) => s.toast);
  if (!pago) return null;
  const copy = () => {
    navigator.clipboard?.writeText(pago.id).catch(() => undefined);
    toast(x('ID de pago {id} copiado', 'Payment ID {id} copied', { id: pago.id }), 'info');
  };
  return (
    <Block title={x('Pago · Mercado Pago', 'Payment · Mercado Pago')} icon={<CreditCard size={16} />} right={<PagoPill v={pago.estado} />}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{x('ID de pago', 'Payment ID')}</div>
          <button onClick={copy} className="num mt-0.5 inline-flex min-h-[32px] items-center gap-1.5 rounded-md text-sm text-ink hover:text-accent">
            {pago.id}
            <Copy size={13} className="text-muted" />
          </button>
        </div>
        <Field label={x('Monto', 'Amount')} mono>
          {fmtARS(pago.monto, lang)}
        </Field>
        <Field label={x('Medio', 'Method')}>{e('medio', pago.medio)}</Field>
        <Field label={x('Fecha', 'Date')} mono>
          {fmtDateTime(pago.fecha, lang)}
        </Field>
      </div>
      {pago.estado === 'pendiente' && pago.expiraHoras !== undefined && (
        <div className="mt-3 rounded-ctl bg-warn/10 px-3 py-2 text-xs font-medium text-warn">
          {x('Esperando la acreditación · el link de pago vence en {h} h y las fechas se liberan solas.', 'Awaiting credit · the payment link expires in {h} h and the dates are released automatically.', { h: pago.expiraHoras })}
        </div>
      )}
    </Block>
  );
}

/** Contenido de detalle de una reserva (página admin o panel lateral) */
export function ReservaDetail({ reserva: r, scope, layout = 'page' }: { reserva: Reserva; scope: Scope; layout?: 'page' | 'panel' }) {
  const { x, lang } = useT();
  const prop = useApp((s) => s.propiedades.find((p) => p.id === r.propiedadId));
  const [cancelOpen, setCancelOpen] = useState(false);
  const guest = huespedById(r.huespedId);
  const n = nights(r.checkIn, r.checkOut);
  const isFD = r.origen === 'fullday';
  const isExp = prop?.tipo === 'experiencia';

  const stay = (
    <Block title={isExp ? x('Experiencia', 'Experience') : x('Propiedad y estadía', 'Property & stay')} icon={<Home size={16} />}>
      <div className="flex gap-3">
        <Photo src={prop?.fotos[0]} alt={prop?.nombre ?? ''} className="w-24 shrink-0 rounded-ctl sm:w-28" />
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{prop?.nombre}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-ink2">
            <MapPin size={12} /> {prop?.zona} · Chacras de Coria
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <OrigenPill v={r.origen} />
            <EstadoPill v={r.estado} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
        <Field label={isExp ? x('Fecha', 'Date') : 'Check-in'}>{fmtDayLong(r.checkIn, lang)}</Field>
        {!isExp && <Field label="Check-out">{fmtDayLong(r.checkOut, lang)}</Field>}
        {!isExp && <Field label={x('Noches', 'Nights')} mono>{n}</Field>}
        {r.origen !== 'bloqueo' && <Field label={x('Huéspedes', 'Guests')} mono>{r.huespedes}</Field>}
        {r.origen !== 'bloqueo' && (
          <Field label={x('Monto', 'Amount')} mono>
            {fmtARS(r.monto, lang)}
          </Field>
        )}
        <Field label={x('Creada', 'Created')}>{fmtRelative(r.creada, lang)}</Field>
      </div>
      {r.estado === 'cancelada' && r.motivoCancelacion && (
        <div className="mt-3 rounded-ctl bg-danger/10 px-3 py-2 text-xs text-danger">
          <b>{x('Motivo de cancelación:', 'Cancellation reason:')}</b> {r.motivoCancelacion}
        </div>
      )}
    </Block>
  );

  const guestBlock =
    r.origen === 'bloqueo' ? null : (
      <Block title={x('Huésped', 'Guest')} icon={<Users size={16} />}>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-soft text-sm font-bold text-navy">
            {r.huespedNombre
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{r.huespedNombre}</div>
            <div className="text-xs text-ink2">{guest ? `${guest.ciudad} · ${guest.documento}` : x('Datos en el canal de origen', 'Details on the source channel')}</div>
          </div>
        </div>
        {guest && (isFD || scope === 'admin') && (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <a href={`mailto:${guest.email}`} className="flex min-h-[40px] min-w-0 items-center gap-2 rounded-ctl border border-line px-3 text-ink2 hover:text-ink">
              <Mail size={14} className="shrink-0" />
              <span className="truncate">{guest.email}</span>
            </a>
            <span className="flex min-h-[40px] min-w-0 items-center gap-2 rounded-ctl border border-line px-3 text-ink2">
              <Phone size={14} className="shrink-0" />
              <span className="num truncate font-medium">{guest.telefono}</span>
            </span>
          </div>
        )}
        {r.acompanantes.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{x('Acompañantes', 'Companions')}</div>
            <ul className="divide-y divide-line rounded-ctl border border-line">
              {r.acompanantes.map((a) => (
                <li key={a.dni} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="truncate text-ink">{a.nombre}</span>
                  <span className="num shrink-0 text-xs text-ink2">DNI {a.dni}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Block>
    );

  const history = (
    <Block title={x('Historial de estados', 'Status history')} icon={<History size={16} />}>
      <Timeline r={r} />
    </Block>
  );

  const cancelBtn = canCancel(r) ? (
    <button className={cn(layout === 'panel' ? 'btn-secondary w-full text-danger' : 'btn-danger w-full')} onClick={() => setCancelOpen(true)}>
      <XIcon size={16} />
      {r.origen === 'bloqueo' ? x('Liberar fechas', 'Release dates') : x('Cancelar reserva', 'Cancel booking')}
    </button>
  ) : null;

  const modal = <CancelModal reserva={r} open={cancelOpen} onClose={() => setCancelOpen(false)} actor={ACTOR[scope]} />;

  if (layout === 'panel')
    return (
      <div className="space-y-3">
        {r.nueva && (
          <Badge tone="accent" className="ring-2 ring-accent/40">
            {x('Nueva · recién ingresada', 'New · just in')}
          </Badge>
        )}
        {stay}
        {!isFD && <ImportNotice r={r} />}
        {guestBlock}
        {isFD && <IdentityBlock r={r} scope={scope} />}
        {isFD && <PaymentBlock r={r} />}
        {history}
        {cancelBtn}
        {modal}
      </div>
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        {!isFD && <ImportNotice r={r} />}
        {guestBlock}
        {isFD && <IdentityBlock r={r} scope={scope} />}
        {history}
      </div>
      <div className="min-w-0 space-y-4">
        {stay}
        {isFD && <PaymentBlock r={r} />}
        {cancelBtn && (
          <div className="card p-4">
            <div className="mb-2 text-xs text-ink2">{x('La cancelación notifica al huésped por WhatsApp y libera las fechas en todos los canales.', 'Cancelling notifies the guest via WhatsApp and releases the dates on every channel.')}</div>
            {cancelBtn}
          </div>
        )}
      </div>
      {modal}
    </div>
  );
}

/** Panel lateral con el detalle (lee la reserva del store para reflejar cambios en vivo) */
export function ReservaPanel({ id, onClose, scope, footer }: { id: string | null; onClose: () => void; scope: Scope; footer?: ReactNode }) {
  const { x } = useT();
  const r = useApp((s) => (id ? s.reservas.find((z) => z.id === id) : undefined));
  return (
    <SidePanel
      open={!!id && !!r}
      onClose={onClose}
      footer={footer}
      title={
        r ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="num">{r.origen === 'bloqueo' ? x('Bloqueo', 'Block') : r.id}</span>
            <EstadoPill v={r.estado} />
          </div>
        ) : (
          ''
        )
      }
    >
      {r && <ReservaDetail reserva={r} scope={scope} layout="panel" />}
    </SidePanel>
  );
}

