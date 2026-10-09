import { useEffect, useRef, useState } from 'react';
import { Award, Check, ImagePlus, Link2, Sparkles, Star, X } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { CHACRAS_CENTER, PROPIEDADES, SERVICIOS, SUPER_RULE } from '@/data/properties';
import { PROPIETARIOS } from '@/data/users';
import { cn } from '@/lib/utils';
import { Segmented, SidePanel, Switch } from '@/components/ui';
import type { Propiedad, Servicio, TipoAnuncio } from '@/types';
import { Spin, fmtRating } from './shared';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const SAMPLE_PHOTOS = [...PROPIEDADES[4].fotos.slice(0, 2), PROPIEDADES[0].fotos[1], PROPIEDADES[7].fotos[3]];

interface Rep {
  rating: number;
  resenas: number;
}

export function NuevaPropiedad({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { x, e, lang } = useT();
  const addPropiedad = useApp((s) => s.addPropiedad);
  const toast = useApp((s) => s.toast);

  const [tipo, setTipo] = useState<TipoAnuncio>('alojamiento');
  const [nombre, setNombre] = useState('');
  const [owner, setOwner] = useState(PROPIETARIOS[0].id);
  const [capacidad, setCapacidad] = useState(4);
  const [dorm, setDorm] = useState(2);
  const [banos, setBanos] = useState(1);
  const [precio, setPrecio] = useState(150000);
  const [minima, setMinima] = useState(2);
  const [servicios, setServicios] = useState<Servicio[]>(['wifi', 'parrilla']);
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [rep, setRep] = useState<Rep | null>(null);
  const [repLoading, setRepLoading] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [destacado, setDestacado] = useState(false);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Importación (mock) de la reputación de Airbnb a partir de la URL del anuncio
  useEffect(() => {
    setRep(null);
    if (!/airbnb\.[a-z.]+\/rooms\/\d+/i.test(airbnbUrl)) {
      setRepLoading(false);
      return;
    }
    setRepLoading(true);
    const id = setTimeout(() => {
      setRep({ rating: 4.9, resenas: 32 });
      setRepLoading(false);
    }, 1000);
    return () => clearTimeout(id);
  }, [airbnbUrl]);

  const reset = () => {
    setTipo('alojamiento');
    setNombre('');
    setOwner(PROPIETARIOS[0].id);
    setCapacidad(4);
    setDorm(2);
    setBanos(1);
    setPrecio(150000);
    setMinima(2);
    setServicios(['wifi', 'parrilla']);
    setAirbnbUrl('');
    setFotos([]);
    setDestacado(false);
    setTouched(false);
  };

  const meets = !!rep && rep.rating >= SUPER_RULE.rating && rep.resenas >= SUPER_RULE.resenas;
  const nameErr = touched && nombre.trim().length < 3;
  const priceErr = touched && !(precio > 0);

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    const urls = Array.from(list)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 8)
      .map((f) => URL.createObjectURL(f));
    setFotos((prev) => [...prev, ...urls].slice(0, 8));
  };

  const save = () => {
    setTouched(true);
    if (nombre.trim().length < 3 || !(precio > 0)) return;
    const slug = slugify(nombre) || `anuncio-${Date.now()}`;
    const exp = tipo === 'experiencia';
    const p: Propiedad = {
      id: `p-new-${Date.now()}`,
      slug,
      nombre: nombre.trim(),
      tipo,
      destacado,
      airbnbRating: rep?.rating ?? 0,
      airbnbResenas: rep?.resenas ?? 0,
      superSource: meets ? 'auto' : 'none',
      superanfitrion: meets,
      propietarioId: owner,
      descripcion: exp
        ? ['Nueva experiencia en Chacras de Coria, publicada desde el panel de Full Day.', 'New experience in Chacras de Coria, published from the Full Day dashboard.']
        : ['Nuevo alojamiento en Chacras de Coria, publicado desde el panel de Full Day.', 'New home in Chacras de Coria, published from the Full Day dashboard.'],
      zona: 'Chacras de Coria',
      capacidad,
      dormitorios: exp ? 0 : dorm,
      banos: exp ? 0 : banos,
      precioNoche: precio,
      estadiaMinima: exp ? 1 : minima,
      servicios: exp ? [] : servicios,
      fotos: fotos.length ? fotos : SAMPLE_PHOTOS,
      lat: CHACRAS_CENTER[0] + (Math.random() - 0.5) * 0.012,
      lng: CHACRAS_CENTER[1] + (Math.random() - 0.5) * 0.012,
      rating: 5,
      resenas: 0,
      feeds: airbnbUrl ? { airbnb: { url: airbnbUrl.replace(/\/rooms\/(\d+).*/, '/calendar/ical/$1.ics'), estado: 'ok', ultimaSyncMin: 0 } } : {},
      activa: true,
      nueva: true,
      ...(exp ? { duracion: ['2 h', '2 h'] as [string, string], horario: '11:00', categoria: ['Experiencia', 'Experience'] as [string, string] } : {}),
    };
    addPropiedad(p);
    toast(
      x('“{n}” publicada · {s}', '“{n}” published · {s}', {
        n: p.nombre,
        s: meets ? x('Superanfitrión automático', 'automatic Superhost') : x('aparece en el catálogo', 'now in the catalog'),
      }),
    );
    reset();
    onClose();
  };

  const num = (v: string) => Math.max(0, Number(v.replace(/\D/g, '')) || 0);

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={x('Nueva propiedad', 'New property')}
      footer={
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>
            {x('Cancelar', 'Cancel')}
          </button>
          <button className="btn-primary flex-1" onClick={save}>
            <Check size={16} />
            {x('Publicar', 'Publish')}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="label">{x('Tipo de anuncio', 'Listing type')}</span>
          <Segmented
            full
            value={tipo}
            onChange={setTipo}
            options={[
              { value: 'alojamiento', label: x('Alojamiento', 'Home') },
              { value: 'experiencia', label: x('Experiencia', 'Experience') },
            ]}
          />
        </div>

        <div>
          <label className="label" htmlFor="np-nombre">
            {x('Nombre', 'Name')}
          </label>
          <input id="np-nombre" className={cn('input', nameErr && 'border-danger')} value={nombre} onChange={(ev) => setNombre(ev.target.value)} placeholder={tipo === 'experiencia' ? x('Ej.: Taller de empanadas', 'e.g. Empanada workshop') : x('Ej.: Casa Las Moras', 'e.g. Casa Las Moras')} />
          {nameErr && <p className="mt-1 text-xs text-danger">{x('Ingresá un nombre de al menos 3 letras.', 'Enter a name with at least 3 letters.')}</p>}
          {nombre && <p className="mt-1 font-mono text-[11px] text-muted">fullday.ar/propiedad/{slugify(nombre)}</p>}
        </div>

        <div>
          <label className="label" htmlFor="np-owner">
            {x('Propietario', 'Owner')}
          </label>
          <select id="np-owner" className="input" value={owner} onChange={(ev) => setOwner(ev.target.value)}>
            {PROPIETARIOS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={cn('grid gap-3', tipo === 'alojamiento' ? 'grid-cols-3' : 'grid-cols-1')}>
          <NumField label={tipo === 'alojamiento' ? x('Huéspedes', 'Guests') : x('Cupo por grupo', 'Group size')} value={capacidad} onChange={setCapacidad} />
          {tipo === 'alojamiento' && <NumField label={x('Dormitorios', 'Bedrooms')} value={dorm} onChange={setDorm} />}
          {tipo === 'alojamiento' && <NumField label={x('Baños', 'Bathrooms')} value={banos} onChange={setBanos} />}
        </div>

        <div className={cn('grid gap-3', tipo === 'alojamiento' ? 'grid-cols-2' : 'grid-cols-1')}>
          <div>
            <label className="label" htmlFor="np-precio">
              {tipo === 'alojamiento' ? x('Precio por noche (ARS)', 'Price per night (ARS)') : x('Precio por persona (ARS)', 'Price per person (ARS)')}
            </label>
            <input id="np-precio" inputMode="numeric" className={cn('input num', priceErr && 'border-danger')} value={precio ? precio.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US') : ''} onChange={(ev) => setPrecio(num(ev.target.value))} />
          </div>
          {tipo === 'alojamiento' && <NumField label={x('Estadía mínima (noches)', 'Minimum stay (nights)')} value={minima} onChange={setMinima} />}
        </div>

        {tipo === 'alojamiento' && (
          <div>
            <span className="label">{x('Servicios', 'Amenities')}</span>
            <div className="flex flex-wrap gap-2">
              {SERVICIOS.map((s) => {
                const on = servicios.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setServicios((prev) => (on ? prev.filter((v) => v !== s) : [...prev, s]))}
                    className={cn('inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition', on ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-ink2 hover:text-ink')}
                  >
                    {on && <Check size={13} />}
                    {e('servicio', s)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="np-airbnb">
            {x('URL del anuncio en Airbnb', 'Airbnb listing URL')}
          </label>
          <div className="relative">
            <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input id="np-airbnb" className="input pl-9 font-mono text-[13px]" value={airbnbUrl} onChange={(ev) => setAirbnbUrl(ev.target.value.trim())} placeholder="https://www.airbnb.com.ar/rooms/48213377" />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {!airbnbUrl && (
              <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={() => setAirbnbUrl('https://www.airbnb.com.ar/rooms/48213377')}>
                {x('Usar URL de ejemplo', 'Use sample URL')}
              </button>
            )}
            {airbnbUrl && !repLoading && !rep && <span className="text-xs text-warn">{x('Pegá un link del tipo airbnb.com.ar/rooms/…', 'Paste a link like airbnb.com/rooms/…')}</span>}
          </div>
          {repLoading && (
            <div className="mt-2 flex items-center gap-2 rounded-ctl border border-line bg-subtle px-3 py-2.5 text-[13px] text-ink2">
              <Spin className="h-3.5 w-3.5 text-accent" />
              {x('Importando reputación desde Airbnb…', 'Importing reputation from Airbnb…')}
            </div>
          )}
          {rep && (
            <div className="fade-up mt-2 rounded-ctl border border-ok/30 bg-ok/[0.07] px-3 py-2.5 text-[13px]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
                <Sparkles size={14} className="text-ok" />
                {x('Reputación importada:', 'Reputation imported:')}
                <span className="num">
                  {fmtRating(rep.rating, lang)} ★ · {rep.resenas} {x('reseñas', 'reviews')}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-ink2">
                <Award size={13} className="text-gold" />
                {meets ? x('→ Superanfitrión automático (cumple la regla)', '→ automatic Superhost (meets the rule)') : x('→ no alcanza la regla, sin badge', '→ below the rule, no badge')}
              </div>
            </div>
          )}
        </div>

        <div>
          <span className="label">{x('Fotos', 'Photos')}</span>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(ev) => onFiles(ev.target.files)} />
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f, i) => (
              <div key={f} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-subtle">
                <img src={f} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="pill absolute left-1 top-1 bg-card/90 text-[10px] text-ink">{x('Portada', 'Cover')}</span>}
                <button type="button" onClick={() => setFotos((prev) => prev.filter((v) => v !== f))} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white" aria-label={x('Quitar foto', 'Remove photo')}>
                  <X size={14} />
                </button>
              </div>
            ))}
            {fotos.length < 8 && (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong text-xs text-ink2 transition hover:border-accent hover:text-accent">
                <ImagePlus size={18} />
                {x('Subir', 'Upload')}
              </button>
            )}
          </div>
          <button type="button" className="mt-2 text-xs font-medium text-accent hover:underline" onClick={() => setFotos(SAMPLE_PHOTOS)}>
            {x('Usar fotos de ejemplo', 'Use sample photos')}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-ctl border border-line px-3">
          <div className="min-w-0 py-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Star size={14} className="fill-accent text-accent" />
              {x('Destacado', 'Featured')}
            </div>
            <div className="text-xs text-ink2">{x('Aparece primero en el catálogo.', 'Shows up first in the catalog.')}</div>
          </div>
          <Switch checked={destacado} onChange={setDestacado} label={x('Destacado', 'Featured')} />
        </div>
      </div>
    </SidePanel>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="min-w-0">
      <span className="label truncate">{label}</span>
      <div className="flex h-11 items-center rounded-ctl border border-line-strong bg-card">
        <button type="button" className="h-full w-9 shrink-0 text-lg text-ink2 hover:text-ink" onClick={() => onChange(Math.max(1, value - 1))} aria-label="−">
          −
        </button>
        <span className="num min-w-0 flex-1 text-center text-sm text-ink">{value}</span>
        <button type="button" className="h-full w-9 shrink-0 text-lg text-ink2 hover:text-ink" onClick={() => onChange(Math.min(30, value + 1))} aria-label="+">
          +
        </button>
      </div>
    </div>
  );
}
