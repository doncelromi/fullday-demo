import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, CalendarDays, ImagePlus, Lock, MapPin, Pencil, Star, Trash2, Users } from 'lucide-react';
import { PageHeader, Photo, PreviewBanner, SidePanel, SuperhostBadge } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { MARIELA_PROPS } from '@/data/selectors';
import { cn } from '@/lib/utils';
import { fmtARS, fmtRelative } from '@/lib/format';
import type { Propiedad } from '@/types';
import { BlockDatesModal } from '@/pages/shared/BlockDatesModal';

function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} className={i < n ? 'fill-gold text-gold' : 'text-line-strong'} />
      ))}
    </span>
  );
}

function EditPanel({ prop, onClose }: { prop: Propiedad | null; onClose: () => void }) {
  const { x, lang } = useT();
  const updatePropiedad = useApp((s) => s.updatePropiedad);
  const toast = useApp((s) => s.toast);
  const [precio, setPrecio] = useState('');
  const [minima, setMinima] = useState(2);
  const [desc, setDesc] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const li = lang === 'es' ? 0 : 1;

  useEffect(() => {
    if (!prop) return;
    setPrecio(String(prop.precioNoche));
    setMinima(prop.estadiaMinima);
    setDesc(prop.descripcion[li]);
    setFotos(prop.fotos);
    setErr('');
  }, [prop?.id, li]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!prop) return null;

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const urls = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => URL.createObjectURL(f));
    setFotos((cur) => [...cur, ...urls]);
    toast(x('{n} fotos agregadas · guardá para publicarlas', '{n} photos added · save to publish them', { n: urls.length }), 'info');
  };

  const save = () => {
    const p = Number(precio.replace(/\D/g, ''));
    if (!p || p < 10000) return setErr(x('Ingresá un precio por noche válido (mínimo $ 10.000).', 'Enter a valid nightly price (minimum ARS 10,000).'));
    if (!desc.trim()) return setErr(x('La descripción no puede quedar vacía.', 'The description can’t be empty.'));
    if (!fotos.length) return setErr(x('Dejá al menos una foto.', 'Keep at least one photo.'));
    const descripcion: [string, string] = [...prop.descripcion] as [string, string];
    descripcion[li] = desc.trim();
    updatePropiedad(prop.id, { precioNoche: p, estadiaMinima: minima, descripcion, fotos });
    toast(x('{p} actualizada · los cambios ya se ven en Full Day', '{p} updated · changes are live on Full Day', { p: prop.nombre }));
    onClose();
  };

  return (
    <SidePanel
      open={!!prop}
      onClose={onClose}
      title={x('Editar {p}', 'Edit {p}', { p: prop.nombre })}
      footer={
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>
            {x('Cancelar', 'Cancel')}
          </button>
          <button className="btn-primary flex-1" onClick={save}>
            {x('Guardar cambios', 'Save changes')}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ep-precio">
              {x('Precio por noche (ARS)', 'Nightly price (ARS)')}
            </label>
            <input id="ep-precio" inputMode="numeric" className="input num" value={precio} onChange={(ev) => setPrecio(ev.target.value.replace(/[^\d]/g, ''))} />
            <div className="mt-1 text-xs text-muted">{precio ? fmtARS(Number(precio), lang) : ''}</div>
          </div>
          <div>
            <label className="label" htmlFor="ep-min">
              {x('Estadía mínima', 'Minimum stay')}
            </label>
            <select id="ep-min" className="input" value={minima} onChange={(ev) => setMinima(Number(ev.target.value))}>
              {[1, 2, 3, 4, 5, 7].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? x('1 noche', '1 night') : x('{n} noches', '{n} nights', { n })}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ep-desc">
            {x('Descripción ({l})', 'Description ({l})', { l: lang === 'es' ? 'español' : 'English' })}
          </label>
          <textarea id="ep-desc" rows={5} className="input py-2.5 leading-relaxed" value={desc} onChange={(ev) => setDesc(ev.target.value)} maxLength={600} />
          <div className="mt-1 text-right text-xs text-muted">
            <span className="num font-normal">{desc.length}</span>/600
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">{x('Fotos', 'Photos')}</span>
            <span className="text-xs text-muted">{x('La primera es la portada', 'The first one is the cover')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f, i) => (
              <div key={f + i} className="relative">
                <Photo src={f} alt={`${prop.nombre} ${i + 1}`} ratio="1/1" className="rounded-[8px]" />
                {i === 0 && <span className="pill absolute left-1 top-1 bg-black/60 text-[10px] text-white">{x('Portada', 'Cover')}</span>}
                <button
                  type="button"
                  onClick={() => setFotos((cur) => cur.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-danger"
                  aria-label={x('Quitar foto', 'Remove photo')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[8px] border-2 border-dashed border-line-strong text-xs font-medium text-ink2 hover:border-accent hover:text-accent">
              <ImagePlus size={20} />
              {x('Agregar', 'Add')}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(ev) => {
              addFiles(ev.target.files);
              ev.target.value = '';
            }}
          />
        </div>
        {err && <p className="rounded-ctl bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">{err}</p>}
      </div>
    </SidePanel>
  );
}

export default function OwnerPropiedades() {
  const { x, b, lang } = useT();
  const navigate = useNavigate();
  const propiedades = useApp((s) => s.propiedades);
  const resenas = useApp((s) => s.resenas);
  const [editId, setEditId] = useState<string | null>(null);
  const [blockProp, setBlockProp] = useState<string | null>(null);

  const props = useMemo(() => MARIELA_PROPS.map((id) => propiedades.find((p) => p.id === id)!).filter(Boolean), [propiedades]);
  const editing = editId ? props.find((p) => p.id === editId) ?? null : null;

  return (
    <>
      <PageHeader
        title={x('Mis propiedades', 'My properties')}
        subtitle={x('Tus 3 casas publicadas en Full Day. Cambiá precio, estadía mínima, descripción y fotos cuando quieras.', 'Your 3 homes listed on Full Day. Change price, minimum stay, description and photos anytime.')}
        actions={
          <button className="btn-primary" onClick={() => setBlockProp(MARIELA_PROPS[0])}>
            <Lock size={16} />
            {x('Bloquear fechas', 'Block dates')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Mariela edita sus casas sin pedirle nada a Javier: precio, mínimo de noches, texto y fotos.', 'Mariela edits her homes without asking Javier: price, minimum nights, copy and photos.'),
          x('Bloquear fechas acá las marca como no disponibles también en Airbnb y Booking.', 'Blocking dates here marks them as unavailable on Airbnb and Booking too.'),
          x('Las reseñas son de huéspedes verificados que se alojaron por Full Day.', 'Reviews come from verified guests who stayed through Full Day.'),
        ]}
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {props.map((p) => {
          const rs = resenas.filter((r) => r.propiedadId === p.id).sort((a, c) => c.fecha.localeCompare(a.fecha));
          return (
            <article key={p.id} className="card flex min-w-0 flex-col overflow-hidden">
              <Photo src={p.fotos[0]} alt={p.nombre} ratio="16/10">
                {p.superanfitrion && <SuperhostBadge f className="absolute left-3 top-3" />}
                <span className="pill absolute bottom-3 right-3 bg-black/60 text-white backdrop-blur">
                  {p.fotos.length} {x('fotos', 'photos')}
                </span>
              </Photo>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-ink">{p.nombre}</h2>
                    <div className="flex items-center gap-1 text-xs text-ink2">
                      <MapPin size={12} />
                      {p.zona} · Chacras de Coria
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1 text-sm font-semibold text-ink">
                      <Star size={14} className="fill-gold text-gold" />
                      <span className="num">{p.rating.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-[11px] text-muted">{x('{n} reseñas', '{n} reviews', { n: p.resenas })}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-ctl bg-subtle p-3">
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{x('Noche', 'Night')}</div>
                    <div className="num truncate text-sm text-ink">{fmtARS(p.precioNoche, lang)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{x('Mínimo', 'Min.')}</div>
                    <div className="truncate text-sm text-ink">
                      <span className="num">{p.estadiaMinima}</span> {x('noches', 'nights')}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{x('Capacidad', 'Sleeps')}</div>
                    <div className="flex items-center gap-1 truncate text-sm text-ink">
                      <Users size={12} className="text-muted" />
                      <span className="num">{p.capacidad}</span>
                      <BedDouble size={12} className="ml-1 text-muted" />
                      <span className="num">{p.dormitorios}</span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-[13px] text-ink2">{b(p.descripcion)}</p>

                <div className="mt-4 border-t border-line pt-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">{x('Últimas reseñas', 'Latest reviews')}</span>
                    <span className="text-muted">{x('{n} verificadas en Full Day', '{n} verified on Full Day', { n: rs.length })}</span>
                  </div>
                  <ul className="space-y-2.5">
                    {rs.slice(0, 2).map((r) => (
                      <li key={r.id} className="rounded-ctl border border-line p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-ink">
                            {r.autor} <span className="font-normal text-muted">· {r.ciudad}</span>
                          </span>
                          <Stars n={r.rating} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] text-ink2">“{b(r.texto)}”</p>
                        <div className="mt-1 text-[11px] text-muted">{fmtRelative(r.fecha, lang)}</div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                  <button className="btn-primary btn-sm" onClick={() => setEditId(p.id)}>
                    <Pencil size={14} />
                    {x('Editar', 'Edit')}
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setBlockProp(p.id)}>
                    <Lock size={14} />
                    {x('Bloquear fechas', 'Block dates')}
                  </button>
                  <button className={cn('btn-ghost btn-sm col-span-2')} onClick={() => navigate('/propietario/calendario', { state: { prop: p.id } })}>
                    <CalendarDays size={14} />
                    {x('Ver en el calendario', 'View on calendar')}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <EditPanel prop={editing} onClose={() => setEditId(null)} />
      <BlockDatesModal open={!!blockProp} onClose={() => setBlockProp(null)} propId={blockProp ?? undefined} />
    </>
  );
}
