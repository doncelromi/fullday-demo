import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Download, Eye, Search, SlidersHorizontal, X as XIcon, XCircle } from 'lucide-react';
import { Badge, Empty, EstadoPill, IdentidadPill, OrigenPill, PageHeader, PreviewBanner, RowMenu, Segmented, Sheet } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { MARIELA_PROPS } from '@/data/selectors';
import { TODAY } from '@/data/seed';
import { cn, downloadText } from '@/lib/utils';
import { fmtARS, fmtRange, iso, nights } from '@/lib/format';
import type { EstadoReserva, Origen, Reserva } from '@/types';
import { CancelModal } from './CancelModal';
import { ACTOR, ReservaPanel, canCancel, type Scope } from './ReservaDetail';

type EstadoF = 'all' | EstadoReserva;
type OrigenF = 'all' | Origen;
const PAGE = 30;

/** Orden: nuevas arriba → en curso/próximas (check-in ascendente) → pasadas (más recientes primero) */
function sortReservas(list: Reserva[]) {
  const today = iso(TODAY);
  return [...list].sort((a, b) => {
    if (!!a.nueva !== !!b.nueva) return a.nueva ? -1 : 1;
    const fa = a.checkOut >= today;
    const fb = b.checkOut >= today;
    if (fa !== fb) return fa ? -1 : 1;
    return fa ? a.checkIn.localeCompare(b.checkIn) : b.checkIn.localeCompare(a.checkIn);
  });
}

export function ReservasView({ scope }: { scope: Scope }) {
  const { x, e, lang } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const all = useApp((s) => s.reservas);
  const propiedades = useApp((s) => s.propiedades);
  const toast = useApp((s) => s.toast);

  const [estado, setEstado] = useState<EstadoF>('all');
  const [origen, setOrigen] = useState<OrigenF>('all');
  const [prop, setProp] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [sheet, setSheet] = useState(false);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Abrir una reserva puntual al llegar desde otra vista (calendario, panel, notificaciones)
  const openFromState = (location.state as { open?: string } | null)?.open;
  useEffect(() => {
    if (openFromState && scope === 'propietario') setPanelId(openFromState);
  }, [openFromState, scope]);

  useEffect(() => setLimit(PAGE), [estado, origen, prop, from, to, q]);

  const scoped = useMemo(() => (scope === 'admin' ? all : all.filter((r) => MARIELA_PROPS.includes(r.propiedadId))), [all, scope]);
  const propOptions = useMemo(() => propiedades.filter((p) => scope === 'admin' || MARIELA_PROPS.includes(p.id)), [propiedades, scope]);
  const propName = (id: string) => propiedades.find((p) => p.id === id)?.nombre ?? id;

  // Todos los filtros salvo estado (para los contadores del segmentado)
  const base = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return scoped.filter((r) => {
      if (origen !== 'all' && r.origen !== origen) return false;
      if (prop !== 'all' && r.propiedadId !== prop) return false;
      if (from && r.checkOut <= from) return false;
      if (to && r.checkIn > to) return false;
      if (qq && !r.id.toLowerCase().includes(qq) && !r.huespedNombre.toLowerCase().includes(qq) && !(r.pagoId ?? '').toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [scoped, origen, prop, from, to, q]);

  const list = useMemo(() => sortReservas(estado === 'all' ? base : base.filter((r) => r.estado === estado)), [base, estado]);
  const count = (s: EstadoReserva) => base.filter((r) => r.estado === s).length;
  const pendientes = scoped.filter((r) => r.estado === 'pendiente').length;
  const activeFilters = [origen !== 'all', prop !== 'all', !!from, !!to].filter(Boolean).length;

  const clear = () => {
    setOrigen('all');
    setProp('all');
    setFrom('');
    setTo('');
    setQ('');
    setEstado('all');
  };

  const open = (r: Reserva) => (scope === 'admin' ? navigate(`/admin/reservas/${r.id}`) : setPanelId(r.id));

  const exportCsv = () => {
    const rows = [['codigo', 'huesped', 'propiedad', 'check_in', 'check_out', 'noches', 'origen', 'estado', 'identidad', 'monto_ars']];
    list.forEach((r) => rows.push([r.id, r.huespedNombre, propName(r.propiedadId), r.checkIn, r.checkOut, String(nights(r.checkIn, r.checkOut)), r.origen, r.estado, r.identidad, String(r.monto)]));
    downloadText(`fullday-reservas-${iso(TODAY)}.csv`, rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n'));
    toast(x('CSV descargado · {n} reservas', 'CSV downloaded · {n} bookings', { n: list.length }));
  };

  const menu = (r: Reserva) => {
    const items: { label: string; onClick: () => void; danger?: boolean; icon?: ReactNode }[] = [{ label: x('Ver detalle', 'View details'), icon: <Eye size={16} />, onClick: () => open(r) }];
    if (canCancel(r))
      items.push({ label: r.origen === 'bloqueo' ? x('Liberar fechas', 'Release dates') : x('Cancelar reserva', 'Cancel booking'), icon: <XCircle size={16} />, onClick: () => setCancelId(r.id), danger: true });
    else if (r.origen === 'airbnb' || r.origen === 'booking')
      items.push({
        label: x('Gestionar en {c}', 'Manage on {c}', { c: e('origen', r.origen) }),
        icon: <ArrowRight size={16} />,
        onClick: () => toast(x('Las reservas de {c} se modifican desde su extranet; Full Day solo bloquea las fechas.', '{c} bookings are changed from their extranet; Full Day only blocks the dates.', { c: e('origen', r.origen) }), 'info'),
      });
    return <RowMenu items={items} label={x('Acciones', 'Actions')} />;
  };

  const estadoOpts: { value: EstadoF; label: string; count?: number }[] = [
    { value: 'all', label: x('Todas', 'All'), count: base.length },
    { value: 'pendiente', label: e('estado', 'pendiente'), count: count('pendiente') },
    { value: 'confirmada', label: e('estado', 'confirmada'), count: count('confirmada') },
    { value: 'finalizada', label: e('estado', 'finalizada'), count: count('finalizada') },
    { value: 'cancelada', label: e('estado', 'cancelada'), count: count('cancelada') },
  ];
  const origenOpts: { value: OrigenF; label: string }[] = [
    { value: 'all', label: x('Todos', 'All') },
    { value: 'fullday', label: 'Full Day' },
    { value: 'airbnb', label: 'Airbnb' },
    { value: 'booking', label: 'Booking' },
    { value: 'bloqueo', label: x('Bloqueo', 'Block') },
  ];

  const filtersBody = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-3">
      <div className="min-w-0">
        <label className="label" htmlFor={`rv-prop-${scope}`}>
          {x('Propiedad', 'Property')}
        </label>
        <select id={`rv-prop-${scope}`} className="input" value={prop} onChange={(ev) => setProp(ev.target.value)}>
          <option value="all">{scope === 'admin' ? x('Todas las propiedades y experiencias', 'All properties and experiences') : x('Mis 3 casas', 'My 3 homes')}</option>
          {propOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <label className="label" htmlFor={`rv-from-${scope}`}>
          {x('Desde', 'From')}
        </label>
        <input id={`rv-from-${scope}`} type="date" className="input" value={from} max={to || undefined} onChange={(ev) => setFrom(ev.target.value)} />
      </div>
      <div className="min-w-0">
        <label className="label" htmlFor={`rv-to-${scope}`}>
          {x('Hasta', 'To')}
        </label>
        <input id={`rv-to-${scope}`} type="date" className="input" value={to} min={from || undefined} onChange={(ev) => setTo(ev.target.value)} />
      </div>
      <div className="min-w-0 lg:col-span-3">
        <div className="label">{x('Origen', 'Source')}</div>
        <div className="flex flex-wrap gap-2">
          {origenOpts.map((o) => {
            const on = origen === o.value;
            const dot = o.value === 'fullday' ? 'bg-accent' : o.value === 'airbnb' ? 'bg-airbnb' : o.value === 'booking' ? 'bg-booking' : o.value === 'bloqueo' ? 'bg-muted' : '';
            return (
              <button key={o.value} type="button" onClick={() => setOrigen(o.value)} className={cn('inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition', on ? 'border-ink bg-ink text-bg' : 'border-line-strong bg-card text-ink2 hover:text-ink')}>
                {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const shown = list.slice(0, limit);
  const cancelR = cancelId ? all.find((r) => r.id === cancelId) ?? null : null;

  return (
    <>
      <PageHeader
        title={scope === 'admin' ? x('Reservas', 'Bookings') : x('Reservas de mis casas', 'Bookings for my homes')}
        subtitle={
          scope === 'admin'
            ? x('Todas las reservas de Full Day, Airbnb y Booking en un solo lugar, con su estado, identidad y pago.', 'Every Full Day, Airbnb and Booking reservation in one place, with status, identity and payment.')
            : x('Las reservas de Casa del Olivar, Cabaña Los Álamos y Loft Viamonte, vengan del canal que vengan.', 'Bookings for Casa del Olivar, Cabaña Los Álamos and Loft Viamonte, whatever channel they come from.')
        }
        actions={
          <button className="btn-secondary" onClick={exportCsv}>
            <Download size={16} />
            {x('Exportar CSV', 'Export CSV')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Reservas de los 3 canales unificadas y filtrables por estado, origen, propiedad y fechas.', 'Bookings from all 3 channels unified and filterable by status, source, property and dates.'),
          x('Cada reserva Full Day guarda identidad, pago de Mercado Pago e historial completo de estados.', 'Each Full Day booking stores identity, Mercado Pago payment and a full status history.'),
          scope === 'admin'
            ? x('Cancelar libera las fechas en Airbnb y Booking y avisa al huésped por WhatsApp.', 'Cancelling releases the dates on Airbnb and Booking and notifies the guest via WhatsApp.')
            : x('Mariela solo ve sus casas: los permisos se aplican por propietario.', 'Mariela only sees her homes: permissions are enforced per owner.'),
        ]}
      />

      {pendientes > 0 && estado !== 'pendiente' && (
        <button type="button" onClick={() => setEstado('pendiente')} className="mb-4 flex w-full items-center gap-3 rounded-card border border-warn/30 bg-warn/[0.07] px-4 py-3 text-left text-[13px] transition hover:bg-warn/[0.11]">
          <AlertCircle size={18} className="shrink-0 text-warn" />
          <span className="min-w-0 flex-1 text-ink2">
            <b className="font-semibold text-warn">{x('{n} reservas pendientes de pago', '{n} bookings pending payment', { n: pendientes })}</b>{' '}
            {x('· las fechas quedan retenidas hasta que Mercado Pago confirme.', '· dates stay on hold until Mercado Pago confirms.')}
          </span>
          <span className="hidden shrink-0 font-semibold text-warn sm:inline">{x('Ver pendientes', 'View pending')} →</span>
        </button>
      )}

      {/* Barra de filtros */}
      <div className="card mb-4 p-3 sm:p-4">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-9 pr-9" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder={x('Buscar por huésped o código (FD-1043)…', 'Search by guest or code (FD-1043)…')} aria-label={x('Buscar', 'Search')} />
            {q && (
              <button className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink" onClick={() => setQ('')} aria-label={x('Limpiar búsqueda', 'Clear search')}>
                <XIcon size={15} />
              </button>
            )}
          </div>
          <button className="btn-secondary relative shrink-0 lg:hidden" onClick={() => setSheet(true)}>
            <SlidersHorizontal size={16} />
            <span className="hidden xs:inline">{x('Filtros', 'Filters')}</span>
            {activeFilters > 0 && <span className="num absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] text-accent-fg">{activeFilters}</span>}
          </button>
        </div>
        <div className="mt-3 hidden lg:block">{filtersBody}</div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Segmented value={estado} onChange={setEstado} options={estadoOpts} />
          {(activeFilters > 0 || q || estado !== 'all') && (
            <button className="btn-ghost btn-sm" onClick={clear}>
              <XIcon size={14} />
              {x('Limpiar filtros', 'Clear filters')}
            </button>
          )}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted">
        <span>
          {x('Mostrando {a} de {b} reservas', 'Showing {a} of {b} bookings', { a: Math.min(limit, list.length), b: list.length })}
        </span>
        <span className="hidden sm:inline">{x('Próximas primero · luego las pasadas', 'Upcoming first · then past ones')}</span>
      </div>

      {list.length === 0 ? (
        <Empty text={x('No hay reservas con estos filtros.', 'No bookings match these filters.')} icon={<Search size={20} />} />
      ) : (
        <>
          {/* Tabla (lg+) */}
          <div className="card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    <th className="th">{x('Código', 'Code')}</th>
                    <th className="th">{x('Huésped', 'Guest')}</th>
                    <th className="th">{x('Propiedad', 'Property')}</th>
                    <th className="th">{x('Fechas', 'Dates')}</th>
                    <th className="th">{x('Origen', 'Source')}</th>
                    <th className="th">{x('Estado', 'Status')}</th>
                    <th className="th hidden xl:table-cell">{x('Identidad', 'Identity')}</th>
                    <th className="th text-right">{x('Monto', 'Amount')}</th>
                    <th className="th w-12">
                      <span className="sr-only">{x('Acciones', 'Actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => open(r)}
                      className={cn('cursor-pointer transition hover:bg-subtle', r.nueva && 'bg-accent-soft/60', r.estado === 'pendiente' && !r.nueva && 'bg-warn/[0.04]')}
                    >
                      <td className="td">
                        <div className="flex items-center gap-2">
                          {r.estado === 'pendiente' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />}
                          <span className="num text-[13px]">{r.origen === 'bloqueo' ? '—' : r.id}</span>
                          {r.nueva && (
                            <Badge tone="accent" className="animate-pulse ring-2 ring-accent/50">
                              {x('Nueva', 'New')}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="td max-w-[180px] truncate font-medium">{r.origen === 'bloqueo' ? <span className="text-muted">{x('Bloqueo manual', 'Manual block')}</span> : r.huespedNombre}</td>
                      <td className="td max-w-[200px] truncate text-ink2">{propName(r.propiedadId)}</td>
                      <td className="td whitespace-nowrap">
                        <span className="num text-[13px] font-medium">{fmtRange(r.checkIn, r.checkOut, lang)}</span>
                        <span className="ml-1.5 text-xs text-muted">· {nights(r.checkIn, r.checkOut)}n</span>
                      </td>
                      <td className="td">
                        <OrigenPill v={r.origen} />
                      </td>
                      <td className="td">
                        <EstadoPill v={r.estado} />
                      </td>
                      <td className="td hidden xl:table-cell">
                        <IdentidadPill v={r.identidad} />
                      </td>
                      <td className="td num whitespace-nowrap text-right">{r.monto ? fmtARS(r.monto, lang) : '—'}</td>
                      <td className="td py-1" onClick={(ev) => ev.stopPropagation()}>
                        {menu(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards (<lg) */}
          <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
            {shown.map((r) => (
              <li
                key={r.id}
                onClick={() => open(r)}
                className={cn('card min-w-0 cursor-pointer p-4 transition active:scale-[0.99]', r.nueva && 'ring-2 ring-accent/60', r.estado === 'pendiente' && 'border-warn/40')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-[13px] text-ink2">{r.origen === 'bloqueo' ? x('Bloqueo', 'Block') : r.id}</span>
                      {r.nueva && (
                        <Badge tone="accent" className="animate-pulse">
                          {x('Nueva', 'New')}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 truncate font-semibold text-ink">{r.origen === 'bloqueo' ? x('Bloqueo manual', 'Manual block') : r.huespedNombre}</div>
                    <div className="truncate text-xs text-ink2">{propName(r.propiedadId)}</div>
                  </div>
                  <div className="-mr-2 -mt-2" onClick={(ev) => ev.stopPropagation()}>
                    {menu(r)}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <OrigenPill v={r.origen} />
                  <EstadoPill v={r.estado} />
                  {r.identidad !== 'n/a' && <IdentidadPill v={r.identidad} />}
                </div>
                <div className="mt-3 flex items-end justify-between gap-2 border-t border-line pt-3">
                  <div className="min-w-0">
                    <div className="num text-[13px]">{fmtRange(r.checkIn, r.checkOut, lang)}</div>
                    <div className="text-xs text-muted">{x('{n} noches', '{n} nights', { n: nights(r.checkIn, r.checkOut) })}</div>
                  </div>
                  <div className="num shrink-0 text-base">{r.monto ? fmtARS(r.monto, lang) : '—'}</div>
                </div>
              </li>
            ))}
          </ul>

          {limit < list.length && (
            <div className="mt-4 flex justify-center">
              <button className="btn-secondary" onClick={() => setLimit((l) => l + PAGE)}>
                {x('Ver más', 'Show more')} <span className="num text-xs text-muted">+{Math.min(PAGE, list.length - limit)}</span>
              </button>
            </div>
          )}
        </>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title={x('Filtros', 'Filters')}>
        {filtersBody}
        <div className="mt-5 flex gap-2">
          <button
            className="btn-secondary flex-1"
            onClick={() => {
              clear();
              setSheet(false);
            }}
          >
            {x('Limpiar', 'Clear')}
          </button>
          <button className="btn-primary flex-1" onClick={() => setSheet(false)}>
            {x('Ver {n} reservas', 'Show {n} bookings', { n: list.length })}
          </button>
        </div>
      </Sheet>

      {scope === 'propietario' && <ReservaPanel id={panelId} onClose={() => setPanelId(null)} scope={scope} />}
      <CancelModal reserva={cancelR} open={!!cancelR} onClose={() => setCancelId(null)} actor={ACTOR[scope]} />
    </>
  );
}
