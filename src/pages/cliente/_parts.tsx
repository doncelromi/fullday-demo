import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Clock,
  Flame,
  Mountain,
  PawPrint,
  Snowflake,
  Star,
  Users,
  Waves,
  Wifi,
  Wine,
  Bath,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { fmtARS, fmtDate, fmtMinAgo } from '@/lib/format';
import { Badge, Modal, Photo, SuperhostBadge } from '@/components/ui';
import type { Propiedad, Resena, Servicio } from '@/types';

export const SERVICE_ICON: Record<Servicio, LucideIcon> = {
  pileta: Waves,
  parrilla: Utensils,
  wifi: Wifi,
  cochera: Car,
  aire: Snowflake,
  pet: PawPrint,
  cordillera: Mountain,
  bodega: Wine,
  jacuzzi: Bath,
  chimenea: Flame,
};

/* ---------- Estrellas ---------- */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-accent text-accent' : 'text-line-strong'} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const { x } = useT();
  const labels = [x('Malo', 'Poor'), x('Regular', 'Fair'), x('Bueno', 'Good'), x('Muy bueno', 'Very good'), x('Excelente', 'Excellent')];
  const shown = hover || value;
  return (
    <div>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-accent-soft"
          >
            <Star size={28} className={cn('transition', i <= shown ? 'fill-accent text-accent' : 'text-line-strong')} />
          </button>
        ))}
      </div>
      <div className="mt-1 h-5 text-sm font-medium text-accent">{shown ? labels[shown - 1] : ''}</div>
    </div>
  );
}

/* ---------- Modal para dejar reseña ---------- */
export function ReviewModal({ open, onClose, prop, reservaId }: { open: boolean; onClose: () => void; prop?: Propiedad; reservaId?: string }) {
  const { x, lang } = useT();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) {
      setRating(0);
      setText('');
    }
  }, [open]);
  if (!prop) return null;
  const submit = () => {
    const s = useApp.getState();
    const r: Resena = {
      id: `rv-${Date.now()}`,
      propiedadId: prop.id,
      autor: 'Sofía Benítez',
      ciudad: 'CABA',
      rating,
      texto: [text, text],
      fecha: new Date().toISOString(),
      reservaId,
      verificada: true,
    };
    s.addResena(r);
    s.toast(lang === 'es' ? `¡Gracias! Tu reseña de ${prop.nombre} ya está publicada.` : `Thanks! Your review of ${prop.nombre} is live.`);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={480}
      title={x('Tu reseña de {p}', 'Your review of {p}', { p: prop.nombre })}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {x('Cancelar', 'Cancel')}
          </button>
          <button className="btn-primary" disabled={!rating || text.trim().length < 10} onClick={submit}>
            {x('Publicar reseña', 'Post review')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Photo src={prop.fotos[0]} alt={prop.nombre} className="w-20 shrink-0 rounded-lg" />
          <div className="min-w-0 text-sm text-ink2">{x('Solo pueden opinar huéspedes con estadía verificada. Tu reseña suma a la reputación del anfitrión.', 'Only guests with a verified stay can review. Your review adds to the host’s reputation.')}</div>
        </div>
        <div>
          <div className="label">{x('¿Cómo la pasaste?', 'How was it?')}</div>
          <StarInput value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="label" htmlFor="rv-text">
            {x('Contale a otros huéspedes', 'Tell other guests')}
          </label>
          <textarea id="rv-text" className="input min-h-[110px] py-2.5" value={text} onChange={(e) => setText(e.target.value)} placeholder={x('La galería, la pileta, la atención…', 'The porch, the pool, the hospitality…')} maxLength={500} />
          <div className="mt-1 text-right text-xs text-muted">{text.length}/500</div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Lista de reseñas ---------- */
export function ReviewList({ items, max = 6 }: { items: Resena[]; max?: number }) {
  const { b, lang, x } = useT();
  const [all, setAll] = useState(false);
  const list = all ? items : items.slice(0, max);
  if (!items.length) return <div className="text-sm text-muted">{x('Todavía no hay reseñas.', 'No reviews yet.')}</div>;
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((r) => (
          <div key={r.id} className={cn('rounded-card border border-line p-4', r.autor === 'Sofía Benítez' && 'ring-2 ring-accent/30')}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-soft text-[13px] font-semibold text-navy">
                {r.autor
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{r.autor}</div>
                <div className="text-xs text-muted">
                  {r.ciudad} · {fmtDate(r.fecha, lang === 'es' ? 'MMMM yyyy' : 'MMMM yyyy', lang)}
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <Stars value={r.rating} size={13} />
              {r.verificada && <Badge tone="ok">{x('Estadía verificada', 'Verified stay')}</Badge>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink2">{b(r.texto)}</p>
          </div>
        ))}
      </div>
      {items.length > max && (
        <button className="btn-secondary mt-4" onClick={() => setAll(!all)}>
          {all ? x('Ver menos', 'Show less') : x('Ver las {n} reseñas', 'Show all {n} reviews', { n: items.length })}
        </button>
      )}
    </div>
  );
}

/* ---------- DNI de muestra (datos ficticios + marca de agua MUESTRA) ---------- */
export function DniSample({ side = 'front', className }: { side?: 'front' | 'back'; className?: string }) {
  return (
    <div className={cn('relative aspect-[1.586] w-full overflow-hidden rounded-[10px] border border-[#c9d4e4] bg-gradient-to-br from-[#eef3fa] via-[#e3ebf6] to-[#d6e2f1] p-[6%] text-[#22324d] shadow-sm', className)}>
      {side === 'front' ? (
        <div className="flex h-full gap-[5%]">
          <div className="flex h-full w-[30%] flex-col justify-between">
            <div className="text-[clamp(6px,1.6vw,9px)] font-bold tracking-wide">REPÚBLICA ARGENTINA</div>
            <div className="aspect-[3/4] w-full rounded-md bg-gradient-to-b from-[#b7c4d8] to-[#8fa2bf]">
              <svg viewBox="0 0 40 52" className="h-full w-full text-[#6c7f9e]">
                <circle cx="20" cy="19" r="9" fill="currentColor" />
                <path d="M4 52c1-12 8-18 16-18s15 6 16 18z" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-[6%] font-mono text-[clamp(6px,1.7vw,10px)] leading-tight">
            <div>
              <div className="opacity-60">APELLIDO / SURNAME</div>
              <div className="font-bold">BENÍTEZ</div>
            </div>
            <div>
              <div className="opacity-60">NOMBRE / NAME</div>
              <div className="font-bold">SOFÍA</div>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="opacity-60">DOCUMENTO</div>
                <div className="font-bold">38.214.557</div>
              </div>
              <div>
                <div className="opacity-60">NAC.</div>
                <div className="font-bold">12 MAR 1994</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between font-mono text-[clamp(6px,1.6vw,9px)]">
          <div className="space-y-1">
            <div>DOMICILIO: AV. CORRIENTES 4100 · CABA</div>
            <div>LUGAR DE NACIMIENTO: BUENOS AIRES</div>
          </div>
          <div className="h-[22%] w-full rounded bg-[repeating-linear-gradient(90deg,#22324d_0_2px,transparent_2px_4px)] opacity-70" />
          <div className="break-all leading-snug tracking-[0.12em]">IDARG38214557&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
            <br />
            9403126F3405181ARG&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="rotate-[-18deg] rounded border-2 border-danger/50 px-3 text-[clamp(14px,4vw,26px)] font-black tracking-[0.3em] text-danger/45">MUESTRA</span>
      </div>
    </div>
  );
}

/* ---------- Indicador de sincronización con Airbnb ---------- */
export function SyncBadge({ className, label }: { className?: string; label?: ReactNode }) {
  const syncedAt = useApp((s) => s.syncedAt);
  const { x, lang } = useT();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const min = Math.max(0, Math.floor((Date.now() - syncedAt) / 60000));
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border border-ok/25 bg-ok/[0.07] px-2.5 py-1 text-[12px] font-medium text-ok', className)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
      </span>
      {label ?? x('Sincronizado con Airbnb y Booking {t}', 'Synced with Airbnb and Booking {t}', { t: fmtMinAgo(min, lang) })}
    </span>
  );
}

/* ---------- Unidad de precio ---------- */
export const priceUnit = (p: Propiedad, x: (es: string, en: string) => string) => (p.tipo === 'experiencia' ? x('/ persona', '/ person') : x('/ noche', '/ night'));

/* ---------- Tarjeta de anuncio ---------- */
export function ListingCard({ p, active, onHover, query = '' }: { p: Propiedad; active?: boolean; onHover?: (id: string | null) => void; query?: string }) {
  const navigate = useNavigate();
  const { x, e, b, lang } = useT();
  return (
    <button
      type="button"
      onClick={() => navigate(`/propiedad/${p.slug}${query}`)}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn('group card flex min-w-0 flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-md', active && 'ring-2 ring-accent')}
      data-trailer={`card-${p.slug}`}
    >
      <Photo src={p.fotos[0]} alt={p.nombre} ratio="4/3" className="w-full">
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {p.superanfitrion && <SuperhostBadge />}
          {p.destacado && (
            <span className="pill bg-accent text-accent-fg shadow-sm">
              <Star size={11} className="fill-current" />
              {x('Destacado', 'Featured')}
            </span>
          )}
        </div>
        {p.tipo === 'experiencia' && p.categoria && <span className="pill absolute bottom-3 left-3 bg-navy-deep/85 text-white backdrop-blur">{b(p.categoria)}</span>}
      </Photo>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-ink">{p.nombre}</div>
            <div className="truncate text-xs text-muted">{p.zona}</div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink">
            <Star size={13} className="fill-accent text-accent" />
            <span className="num">{p.rating.toFixed(2).replace('.', lang === 'es' ? ',' : '.')}</span>
            <span className="font-normal text-muted">({p.resenas})</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink2">
          {p.tipo === 'alojamiento' ? (
            <>
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {x('{n} huésp.', '{n} guests', { n: p.capacidad })}
              </span>
              <span>{x('{n} dorm.', '{n} bd', { n: p.dormitorios })}</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> {b(p.duracion!)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {x('hasta {n}', 'up to {n}', { n: p.capacidad })}
              </span>
            </>
          )}
          <span className="flex items-center gap-1.5 text-muted">
            {p.servicios.slice(0, 5).map((s) => {
              const Icon = SERVICE_ICON[s];
              return <Icon key={s} size={14} aria-label={e('servicio', s)} />;
            })}
          </span>
        </div>
        <div className="mt-auto flex items-baseline gap-1.5 pt-3">
          {p.tipo === 'experiencia' && <span className="text-xs text-muted">{x('Desde', 'From')}</span>}
          <span className="num text-[16px] font-bold text-ink">{fmtARS(p.precioNoche, lang)}</span>
          <span className="text-xs text-muted">{priceUnit(p, x)}</span>
        </div>
      </div>
    </button>
  );
}
