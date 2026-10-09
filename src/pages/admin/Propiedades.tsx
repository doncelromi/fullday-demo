import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CalendarRange, Eye, Info, Pause, Play, Plus, Search, Star, StarOff, Users } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { SUPER_RULE, relevance } from '@/data/properties';
import { PROPIETARIOS, propietarioById } from '@/data/users';
import { metrics, occupancy, periodOf } from '@/data/selectors';
import { fmtARS, fmtARSShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, Badge, Card, Empty, PageHeader, Photo, PreviewBanner, Progress, RowMenu, Segmented, Switch } from '@/components/ui';
import type { Propiedad } from '@/types';
import { Channels, MiniSeg, fmtRating } from './_parts/shared';
import { NuevaPropiedad } from './_parts/NuevaPropiedad';

type Tab = 'alojamiento' | 'experiencia' | 'propietarios';
type SuperMode = 'auto' | 'manual' | 'none';

const meetsRule = (p: Propiedad) => p.airbnbRating >= SUPER_RULE.rating && p.airbnbResenas >= SUPER_RULE.resenas;

export default function AdminPropiedades() {
  const { x, lang } = useT();
  const navigate = useNavigate();
  const propiedades = useApp((s) => s.propiedades);
  const reservas = useApp((s) => s.reservas);
  const setDestacadoStore = useApp((s) => s.setDestacado);
  const setSuperStore = useApp((s) => s.setSuperanfitrion);
  const updatePropiedad = useApp((s) => s.updatePropiedad);
  const toast = useApp((s) => s.toast);

  const [tab, setTab] = useState<Tab>('alojamiento');
  const [q, setQ] = useState('');
  const [nueva, setNueva] = useState(false);

  const month = periodOf('month');
  const occ = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of propiedades) out[p.id] = p.tipo === 'alojamiento' ? occupancy(reservas, month, [p.id]) : metrics(reservas, month, [p.id]).count;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservas, propiedades]);

  const homes = propiedades.filter((p) => p.tipo === 'alojamiento');
  const exps = propiedades.filter((p) => p.tipo === 'experiencia');
  const list = useMemo(() => {
    const base = propiedades.filter((p) => p.tipo === tab);
    const needle = q.trim().toLowerCase();
    const filtered = needle ? base.filter((p) => (p.nombre + ' ' + p.zona + ' ' + propietarioById(p.propietarioId).nombre).toLowerCase().includes(needle)) : base;
    // nuevas arriba, después la relevancia del catálogo (destacados primero)
    return [...filtered].sort((a, b) => Number(!!b.nueva) - Number(!!a.nueva) || relevance(a, b));
  }, [propiedades, tab, q]);

  const setDestacado = (p: Propiedad, v: boolean) => {
    setDestacadoStore(p.id, v);
    toast(v ? x('★ {n} ahora es Destacado · aparece primero en el catálogo', '★ {n} is now Featured · shows up first in the catalog', { n: p.nombre }) : x('{n} ya no es Destacado', '{n} is no longer Featured', { n: p.nombre }), v ? 'ok' : 'info');
  };

  const setSuper = (p: Propiedad, mode: SuperMode) => {
    setSuperStore(p.id, mode);
    if (mode === 'auto')
      toast(
        meetsRule(p)
          ? x('{n}: badge automático · Airbnb {r} ★ con {c} reseñas', '{n}: automatic badge · Airbnb {r} ★ with {c} reviews', { n: p.nombre, r: fmtRating(p.airbnbRating, lang), c: p.airbnbResenas })
          : x('{n} no cumple la regla ({r} ★ · {c} reseñas) · queda sin badge', '{n} doesn’t meet the rule ({r} ★ · {c} reviews) · no badge', { n: p.nombre, r: fmtRating(p.airbnbRating, lang), c: p.airbnbResenas }),
        meetsRule(p) ? 'ok' : 'warn',
      );
    else if (mode === 'manual') toast(x('{n}: Superanfitrión forzado manualmente', '{n}: Superhost forced manually', { n: p.nombre }));
    else toast(x('{n}: se quitó el badge de Superanfitrión', '{n}: Superhost badge removed', { n: p.nombre }), 'info');
  };

  const toggleActiva = (p: Propiedad) => {
    updatePropiedad(p.id, { activa: !p.activa });
    toast(p.activa ? x('{n} pausada · no aparece en el catálogo', '{n} paused · hidden from the catalog', { n: p.nombre }) : x('{n} publicada de nuevo', '{n} published again', { n: p.nombre }), p.activa ? 'info' : 'ok');
  };

  const menu = (p: Propiedad) => [
    { label: p.destacado ? x('Quitar destacado', 'Unfeature') : x('Marcar como destacado', 'Mark as featured'), icon: p.destacado ? <StarOff size={15} /> : <Star size={15} />, onClick: () => setDestacado(p, !p.destacado) },
    { label: x('Superanfitrión: automático', 'Superhost: automatic'), icon: <Award size={15} />, onClick: () => setSuper(p, 'auto') },
    { label: x('Superanfitrión: forzar manual', 'Superhost: force manually'), icon: <Award size={15} />, onClick: () => setSuper(p, 'manual') },
    { label: x('Quitar badge', 'Remove badge'), icon: <Award size={15} />, onClick: () => setSuper(p, 'none') },
    { label: x('Ver sincronización', 'View sync'), icon: <CalendarRange size={15} />, onClick: () => navigate('/admin/calendarios') },
    ...(p.nueva ? [] : [{ label: x('Ver en el catálogo', 'View in catalog'), icon: <Eye size={15} />, onClick: () => navigate(`/propiedad/${p.slug}`) }]),
    { label: p.activa ? x('Pausar publicación', 'Pause listing') : x('Publicar', 'Publish'), icon: p.activa ? <Pause size={15} /> : <Play size={15} />, onClick: () => toggleActiva(p), danger: p.activa },
  ];

  const superOptions = [
    { value: 'auto' as const, label: x('Auto', 'Auto'), title: x('Automático (reputación de Airbnb)', 'Automatic (Airbnb reputation)') },
    { value: 'manual' as const, label: x('Manual', 'Manual'), title: x('Manual (forzar badge)', 'Manual (force badge)') },
    { value: 'none' as const, label: x('Sin badge', 'No badge'), title: x('Sin badge', 'No badge') },
  ];

  const superSourceText = (p: Propiedad) => {
    const rep = `Airbnb ${fmtRating(p.airbnbRating, lang)} ★ · ${p.airbnbResenas} ${x('reseñas', 'reviews')}`;
    if (p.superSource === 'auto') return { tone: 'text-ok', text: `${x('Auto', 'Auto')} · ${rep}` };
    if (p.superSource === 'manual') return { tone: 'text-navy', text: `${x('Manual', 'Manual')} · ${rep}` };
    return { tone: 'text-muted', text: p.airbnbResenas ? `${x('Sin badge', 'No badge')} · ${rep}` : x('Sin badge · sin reputación importada', 'No badge · no imported reputation') };
  };

  const priceLabel = (p: Propiedad) => (p.tipo === 'experiencia' ? x('/ persona', '/ person') : x('/ noche', '/ night'));
  const occLabel = (p: Propiedad) => (p.tipo === 'experiencia' ? x('{n} reservas', '{n} bookings', { n: occ[p.id] ?? 0 }) : `${occ[p.id] ?? 0}%`);

  const nameBlock = (p: Propiedad, withMeta?: boolean) => (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="truncate font-semibold text-ink">{p.nombre}</span>
        {p.nueva && <Badge tone="info">{x('Nueva', 'New')}</Badge>}
        {!p.activa && <Badge tone="muted">{x('Pausada', 'Paused')}</Badge>}
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
        {p.destacado && (
          <Badge tone="accent">
            <Star size={11} className="fill-current" />
            {x('Destacado', 'Featured')}
          </Badge>
        )}
        {p.superanfitrion && (
          <Badge tone="gold">
            <Award size={11} />
            {x('Superanfitrión', 'Superhost')}
          </Badge>
        )}
        <span className="truncate text-xs text-muted">{p.zona}</span>
      </div>
      {withMeta && (
        <>
          <div className="mt-1 text-xs text-ink2 2xl:hidden">
            {propietarioById(p.propietarioId).nombre} · {p.tipo === 'experiencia' ? x('hasta {n} personas', 'up to {n} people', { n: p.capacidad }) : x('{n} huéspedes', '{n} guests', { n: p.capacidad })}
          </div>
          <div className="mt-1.5 2xl:hidden">
            <Channels p={p} />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fade-up">
      <PageHeader
        title={x('Propiedades', 'Properties')}
        subtitle={x('Alojamientos y experiencias de Chacras de Coria. Definí qué anuncios se destacan y quién lleva el badge de Superanfitrión.', 'Homes and experiences in Chacras de Coria. Decide which listings are featured and who carries the Superhost badge.')}
        actions={
          <button className="btn-primary" onClick={() => setNueva(true)} data-tour="btn-nueva-propiedad">
            <Plus size={16} />
            {x('Nueva propiedad', 'New property')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Alta y edición de casas y experiencias con fotos, precios, servicios y propietario.', 'Create and edit homes and experiences with photos, prices, amenities and owner.'),
          x('Los anuncios destacados aparecen primero en el catálogo que ven los huéspedes.', 'Featured listings show up first in the catalog guests browse.'),
          x('El badge de Superanfitrión se asigna solo con la reputación de Airbnb, con override manual.', 'The Superhost badge is set automatically from Airbnb reputation, with manual override.'),
        ]}
      />

      {/* ---------- Reglas de negocio ---------- */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4">
        <div className="card flex gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Star size={18} className="fill-current" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{x('Destacados', 'Featured')}</span>
              <span className="num text-xs text-accent">{x('{n} activos', '{n} active', { n: propiedades.filter((p) => p.destacado).length })}</span>
            </div>
            <p className="mt-1 text-[13px] text-ink2">
              {x('Los destacados aparecen primero en el catálogo. Los activás a mano con el switch de cada anuncio; después se ordenan por reputación.', 'Featured listings show up first in the catalog. Toggle them manually per listing; the rest are sorted by reputation.')}
            </p>
          </div>
        </div>
        <div className="card flex gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Award size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{x('Regla de Superanfitrión', 'Superhost rule')}</span>
              <span className="pill border border-line bg-subtle font-mono text-[11px] text-ink2">
                rating ≥ {fmtRating(SUPER_RULE.rating, lang)} ★ &amp;&amp; {x('reseñas', 'reviews')} ≥ {SUPER_RULE.resenas}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-ink2">
              {x('Se asigna automáticamente con la reputación importada de Airbnb. Si un anuncio no llega (p. ej. Casita del Torreón, 4,76 · 19 reseñas), lo podés forzar en Manual.', 'Assigned automatically from imported Airbnb reputation. If a listing falls short (e.g. Casita del Torreón, 4.76 · 19 reviews), you can force it as Manual.')}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'alojamiento', label: x('Alojamientos', 'Homes'), count: homes.length },
            { value: 'experiencia', label: x('Experiencias', 'Experiences'), count: exps.length },
            { value: 'propietarios', label: x('Propietarios', 'Owners'), count: PROPIETARIOS.length },
          ]}
        />
        {tab !== 'propietarios' && (
          <div className="relative md:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-9" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder={x('Buscar por nombre, zona o propietario', 'Search by name, area or owner')} />
          </div>
        )}
      </div>

      {tab === 'propietarios' ? (
        <Owners />
      ) : list.length === 0 ? (
        <Empty text={x('No hay anuncios que coincidan con la búsqueda.', 'No listings match your search.')} />
      ) : (
        <>
          {/* ---------- Tabla md+ ---------- */}
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    <th className="th">{x('Anuncio', 'Listing')}</th>
                    <th className="th hidden 2xl:table-cell">{x('Propietario', 'Owner')}</th>
                    <th className="th hidden 2xl:table-cell">{x('Cap.', 'Cap.')}</th>
                    <th className="th text-right">{x('Precio', 'Price')}</th>
                    <th className="th">{x('Destacado', 'Featured')}</th>
                    <th className="th">{x('Superanfitrión', 'Superhost')}</th>
                    <th className="th hidden lg:table-cell">{tab === 'experiencia' ? x('Reservas mes', 'Bookings mo.') : x('Ocupación mes', 'Occupancy mo.')}</th>
                    <th className="th hidden 2xl:table-cell">{x('Canales', 'Channels')}</th>
                    <th className="th w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((p) => {
                    const src = superSourceText(p);
                    return (
                      <tr key={p.id} className={cn('transition hover:bg-subtle/60', p.nueva && 'bg-info/[0.04]', !p.activa && 'opacity-60')}>
                        <td className="td">
                          <div className="flex min-w-[220px] items-center gap-3">
                            <Photo src={p.fotos[0]} alt={p.nombre} ratio="4/3" className="w-16 shrink-0 rounded-lg" />
                            {nameBlock(p, true)}
                          </div>
                        </td>
                        <td className="td hidden 2xl:table-cell">
                          <div className="flex items-center gap-2">
                            <Avatar name={propietarioById(p.propietarioId).nombre} role="propietario" size={26} />
                            <span className="whitespace-nowrap text-[13px]">{propietarioById(p.propietarioId).nombre}</span>
                          </div>
                        </td>
                        <td className="td num hidden text-[13px] 2xl:table-cell">
                          <span className="inline-flex items-center gap-1">
                            <Users size={13} className="text-muted" />
                            {p.capacidad}
                          </span>
                        </td>
                        <td className="td whitespace-nowrap text-right">
                          <div className="num text-[13px]">{fmtARS(p.precioNoche, lang)}</div>
                          <div className="text-[11px] text-muted">{priceLabel(p)}</div>
                        </td>
                        <td className="td">
                          <Switch checked={p.destacado} onChange={(v) => setDestacado(p, v)} label={x('Destacado', 'Featured')} />
                        </td>
                        <td className="td">
                          <MiniSeg value={p.superSource} onChange={(m) => setSuper(p, m)} options={superOptions} label={x('Superanfitrión', 'Superhost')} />
                          <div className={cn('mt-1 max-w-[230px] truncate text-[11px] font-medium', src.tone)} title={src.text}>
                            {src.text}
                          </div>
                        </td>
                        <td className="td hidden lg:table-cell">
                          {p.tipo === 'alojamiento' ? (
                            <div className="w-24">
                              <div className="num mb-1 text-[13px]">{occLabel(p)}</div>
                              <Progress value={occ[p.id] ?? 0} className="h-1.5" />
                            </div>
                          ) : (
                            <span className="num text-[13px]">{occ[p.id] ?? 0}</span>
                          )}
                        </td>
                        <td className="td hidden 2xl:table-cell">
                          <Channels p={p} />
                        </td>
                        <td className="td">
                          <RowMenu items={menu(p)} label={x('Acciones', 'Actions')} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---------- Cards mobile ---------- */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {list.map((p) => {
              const src = superSourceText(p);
              return (
                <div key={p.id} className={cn('card p-3', p.nueva && 'border-info/40', !p.activa && 'opacity-70')}>
                  <div className="flex gap-3">
                    <Photo src={p.fotos[0]} alt={p.nombre} ratio="1/1" className="w-20 shrink-0 rounded-lg xs:w-24" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1">
                        <div className="min-w-0 flex-1">
                          {nameBlock(p)}
                        </div>
                        <div className="-mr-2 -mt-2">
                          <RowMenu items={menu(p)} label={x('Acciones', 'Actions')} />
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-ink2">{propietarioById(p.propietarioId).nombre}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span>
                          <span className="num text-ink">{fmtARS(p.precioNoche, lang)}</span> <span className="text-muted">{priceLabel(p)}</span>
                        </span>
                        <span className="text-ink2">
                          {p.tipo === 'experiencia' ? x('Este mes:', 'This month:') : x('Ocupación:', 'Occupancy:')} <span className="num text-ink">{occLabel(p)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                    <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <Switch checked={p.destacado} onChange={(v) => setDestacado(p, v)} label={x('Destacado', 'Featured')} />
                      {x('Destacado', 'Featured')}
                    </label>
                    <Channels p={p} />
                  </div>
                  <div className="mt-1">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{x('Superanfitrión', 'Superhost')}</div>
                    <MiniSeg value={p.superSource} onChange={(m) => setSuper(p, m)} options={superOptions} label={x('Superanfitrión', 'Superhost')} />
                    <div className={cn('mt-1 text-[11px] font-medium', src.tone)}>{src.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <Info size={13} />
            {x('Orden: nuevas, destacados, Superanfitriones y reputación — el mismo que ve el huésped en el catálogo.', 'Order: new, featured, Superhosts and reputation — the same order guests see in the catalog.')}
          </p>
        </>
      )}

      <NuevaPropiedad
        open={nueva}
        onClose={() => {
          setNueva(false);
        }}
      />
    </div>
  );
}

function Owners() {
  const { x, lang } = useT();
  const propiedades = useApp((s) => s.propiedades);
  const reservas = useApp((s) => s.reservas);
  const toast = useApp((s) => s.toast);
  const per = periodOf('3m');
  const rows = useMemo(
    () =>
      PROPIETARIOS.map((o) => {
        const props = propiedades.filter((p) => p.propietarioId === o.id);
        const ids = props.map((p) => p.id);
        return { o, props, revenue: metrics(reservas, per, ids).revenue };
      }).sort((a, b) => b.revenue - a.revenue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [propiedades, reservas],
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:gap-4">
      {rows.map(({ o, props, revenue }) => (
        <Card key={o.id} bodyClass="p-4">
          <div className="flex items-start gap-3">
            <Avatar name={o.nombre} role="propietario" size={42} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink">{o.nombre}</div>
              <div className="truncate text-xs text-ink2">{o.email}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-gold">
                <Award size={12} />
                {x('Superanfitrión desde {y}', 'Superhost since {y}', { y: o.superanfitrionDesde })}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-ctl bg-subtle px-3 py-2">
              <div className="kpi-label">{x('Anuncios', 'Listings')}</div>
              <div className="num mt-1 text-lg text-ink">{props.length}</div>
            </div>
            <div className="rounded-ctl bg-subtle px-3 py-2">
              <div className="kpi-label">{x('Facturó 3 m', 'Revenue 3 mo')}</div>
              <div className="num mt-1 text-lg text-ink">{fmtARSShort(revenue, lang)}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {props.map((p) => (
              <span key={p.id} className="pill border border-line bg-card text-ink2">
                {p.destacado && <Star size={10} className="fill-accent text-accent" />}
                {p.nombre}
              </span>
            ))}
          </div>
          <button className="btn-secondary btn-sm mt-4 w-full" onClick={() => toast(x('Abrimos WhatsApp con {n} ({t})', 'Opening WhatsApp with {n} ({t})', { n: o.nombre, t: o.telefono }), 'info')}>
            {x('Contactar', 'Contact')}
          </button>
        </Card>
      ))}
    </div>
  );
}
