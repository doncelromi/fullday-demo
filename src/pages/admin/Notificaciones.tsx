import { useMemo, useState } from 'react';
import { AlertCircle, Check, CheckCheck, MessageCircle, RotateCcw, Smartphone } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, DevNotice, Empty, PageHeader, PreviewBanner, Segmented, Switch } from '@/components/ui';
import type { EstadoEntrega, Notificacion, Plantilla, Role } from '@/types';
import { PlantillasTab } from './_parts/PlantillaEditor';

type Tab = 'plantillas' | 'enviados' | 'config';

export default function AdminNotificaciones() {
  const { x } = useT();
  const plantillas = useApp((s) => s.plantillas);
  const notifs = useApp((s) => s.notifs);
  const [tab, setTab] = useState<Tab>('plantillas');

  return (
    <div className="fade-up">
      <PageHeader
        title={x('Notificaciones', 'Notifications')}
        subtitle={x('Editá los mensajes automáticos de WhatsApp y controlá qué se envió, a quién y si lo leyeron.', 'Edit the automatic WhatsApp messages and track what was sent, to whom and whether it was read.')}
      />
      <PreviewBanner
        bullets={[
          x('Mensajes automáticos por WhatsApp en cada paso: reserva, pago, confirmación y recordatorio.', 'Automatic WhatsApp messages at every step: booking, payment, confirmation and reminder.'),
          x('Vos editás los textos con variables (huésped, casa, fecha) sin depender de un programador.', 'You edit the texts with variables (guest, home, date) without needing a developer.'),
          x('Registro de entrega y lectura de cada mensaje, con reintento si falla.', 'Delivery and read log for every message, with retry on failure.'),
        ]}
      />
      <DevNotice
        feature="WhatsApp Business API"
        now={x('los envíos y estados de entrega se simulan.', 'sends and delivery statuses are simulated.')}
        later={x('se conecta la API oficial de WhatsApp Business (Meta) con plantillas aprobadas.', 'the official WhatsApp Business API (Meta) is connected with approved templates.')}
      />

      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'plantillas', label: x('Plantillas', 'Templates'), count: plantillas.length },
            { value: 'enviados', label: x('Enviados', 'Sent'), count: notifs.length },
            { value: 'config', label: x('Configuración por rol', 'Settings by role') },
          ]}
        />
      </div>

      {tab === 'plantillas' && <PlantillasTab />}
      {tab === 'enviados' && <EnviadosTab />}
      {tab === 'config' && <ConfigTab />}
    </div>
  );
}

/* ---------------- Enviados ---------------- */

function EntregaIcon({ v }: { v: EstadoEntrega }) {
  const { e } = useT();
  const map = {
    enviado: { icon: <Check size={14} />, c: 'text-ink2' },
    entregado: { icon: <CheckCheck size={14} />, c: 'text-ink2' },
    leido: { icon: <CheckCheck size={14} />, c: 'text-info' },
    fallido: { icon: <AlertCircle size={14} />, c: 'text-danger' },
  }[v];
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium', map.c)}>
      {map.icon}
      {e('entrega', v)}
    </span>
  );
}

function EnviadosTab() {
  const { x, e, b, lang } = useT();
  const notifs = useApp((s) => s.notifs);
  const toast = useApp((s) => s.toast);
  const [canal, setCanal] = useState<'todos' | Notificacion['canal']>('todos');
  const [estado, setEstado] = useState<'todos' | EstadoEntrega>('todos');
  const [limit, setLimit] = useState(40);
  const [retried, setRetried] = useState<Record<string, EstadoEntrega>>({});

  const items = useMemo(() => notifs.map((n) => (retried[n.id] ? { ...n, estado: retried[n.id] } : n)), [notifs, retried]);
  const byCanal = items.filter((n) => canal === 'todos' || n.canal === canal);
  const list = byCanal.filter((n) => estado === 'todos' || n.estado === estado);
  const count = (s: EstadoEntrega) => byCanal.filter((n) => n.estado === s).length;

  const retry = (n: Notificacion) => {
    setRetried((r) => ({ ...r, [n.id]: 'enviado' }));
    toast(x('Reenviando “{p}” a {d} por {c}…', 'Resending “{p}” to {d} via {c}…', { p: e('plantilla', n.plantilla), d: n.destinatario, c: e('canal', n.canal) }), 'info');
    setTimeout(() => setRetried((r) => ({ ...r, [n.id]: 'entregado' })), 2200);
  };


  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <Segmented
          value={canal}
          onChange={(v) => {
            setCanal(v);
            setLimit(40);
          }}
          options={[
            { value: 'todos', label: x('Todos los canales', 'All channels'), count: items.length },
            { value: 'whatsapp', label: 'WhatsApp', count: items.filter((n) => n.canal === 'whatsapp').length },
            { value: 'app', label: e('canal', 'app'), count: items.filter((n) => n.canal === 'app').length },
          ]}
        />
        <Segmented
          value={estado}
          onChange={(v) => {
            setEstado(v);
            setLimit(40);
          }}
          options={[
            { value: 'todos', label: x('Todos', 'All') },
            { value: 'enviado', label: e('entrega', 'enviado'), count: count('enviado') },
            { value: 'entregado', label: e('entrega', 'entregado'), count: count('entregado') },
            { value: 'leido', label: e('entrega', 'leido'), count: count('leido') },
            { value: 'fallido', label: e('entrega', 'fallido'), count: count('fallido') },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Empty text={x('No hay mensajes con estos filtros.', 'No messages with these filters.')} />
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    <th className="th">{x('Destinatario', 'Recipient')}</th>
                    <th className="th">{x('Plantilla', 'Template')}</th>
                    <th className="th hidden xl:table-cell">{x('Mensaje', 'Message')}</th>
                    <th className="th">{x('Canal', 'Channel')}</th>
                    <th className="th">{x('Entrega', 'Delivery')}</th>
                    <th className="th hidden lg:table-cell">{x('Fecha', 'Date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.slice(0, limit).map((n) => (
                    <tr key={n.id} className={cn(n.estado === 'fallido' && 'bg-danger/[0.04]')}>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Avatar name={n.destinatario} role={n.rol} size={28} />
                          <div className="min-w-0">
                            <div className="max-w-[170px] truncate text-[13px] font-medium">{n.destinatario}</div>
                            <div className="text-[11px] text-muted">{e('role', n.rol)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td whitespace-nowrap text-[13px]">{e('plantilla', n.plantilla)}</td>
                      <td className="td hidden max-w-[300px] xl:table-cell">
                        <div className="truncate text-[12.5px] text-ink2" title={b(n.texto)}>
                          {b(n.texto)}
                        </div>
                      </td>
                      <td className="td">
                        <CanalTag c={n.canal} />
                      </td>
                      <td className="td">
                        <div className="flex flex-wrap items-center gap-2">
                          <EntregaIcon v={n.estado} />
                          {n.estado === 'fallido' && (
                            <button className="btn-secondary btn-sm min-h-[32px] px-2 text-xs" onClick={() => retry(n)}>
                              <RotateCcw size={12} />
                              {x('Reintentar', 'Retry')}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="td hidden whitespace-nowrap text-[12.5px] text-ink2 lg:table-cell">{fmtDateTime(n.fecha, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {list.slice(0, limit).map((n) => (
              <div key={n.id} className={cn('card p-3.5', n.estado === 'fallido' && 'border-danger/40')}>
                <div className="flex items-start gap-2.5">
                  <Avatar name={n.destinatario} role={n.rol} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-ink">{n.destinatario}</div>
                        <div className="text-[11.5px] text-ink2">
                          {e('plantilla', n.plantilla)} · {fmtDateTime(n.fecha, lang)}
                        </div>
                      </div>
                      <CanalTag c={n.canal} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink2">{b(n.texto)}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <EntregaIcon v={n.estado} />
                      {n.estado === 'fallido' && (
                        <button className="btn-secondary btn-sm" onClick={() => retry(n)}>
                          <RotateCcw size={13} />
                          {x('Reintentar', 'Retry')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {list.length > limit && (
            <div className="mt-3 flex justify-center">
              <button className="btn-secondary btn-sm" onClick={() => setLimit((l) => l + 40)}>
                {x('Ver más ({n} restantes)', 'Show more ({n} left)', { n: list.length - limit })}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CanalTag({ c }: { c: Notificacion['canal'] }) {
  const { e } = useT();
  return c === 'whatsapp' ? (
    <span className="pill bg-ok/10 text-ok">
      <MessageCircle size={11} />
      {e('canal', c)}
    </span>
  ) : (
    <span className="pill bg-navy-soft text-navy">
      <Smartphone size={11} />
      {e('canal', c)}
    </span>
  );
}

/* ---------------- Configuración por rol ---------------- */

const EVENTS: Plantilla[] = ['recibida', 'confirmada', 'cancelada', 'pago', 'recordatorio', 'sync'];
const ROLES: Role[] = ['admin', 'propietario', 'cliente'];
const DEFAULT_MATRIX: Record<Plantilla, Record<Role, boolean>> = {
  recibida: { admin: true, propietario: true, cliente: true },
  confirmada: { admin: true, propietario: true, cliente: true },
  cancelada: { admin: true, propietario: true, cliente: true },
  pago: { admin: true, propietario: false, cliente: true },
  recordatorio: { admin: false, propietario: true, cliente: true },
  sync: { admin: true, propietario: true, cliente: false },
};

function ConfigTab() {
  const { x, e } = useT();
  const toast = useApp((s) => s.toast);
  const [m, setM] = useState(DEFAULT_MATRIX);

  const roleLabel = (r: Role) => (r === 'cliente' ? x('Huésped', 'Guest') : e('role', r));

  const set = (ev: Plantilla, r: Role, v: boolean) => {
    setM((prev) => ({ ...prev, [ev]: { ...prev[ev], [r]: v } }));
    toast(
      v
        ? x('{e} → {r}: activado', '{e} → {r}: enabled', { e: e('plantilla', ev), r: roleLabel(r) })
        : x('{e} → {r}: desactivado', '{e} → {r}: disabled', { e: e('plantilla', ev), r: roleLabel(r) }),
      v ? 'ok' : 'info',
    );
  };

  return (
    <div>
      <p className="mb-3 text-[13px] text-ink2">{x('Elegí qué eventos le llegan a cada rol. Los cambios aplican a los próximos envíos.', 'Choose which events reach each role. Changes apply to upcoming messages.')}</p>
      <div className="card hidden overflow-hidden sm:block">
        <table className="w-full">
          <thead className="border-b border-line bg-subtle">
            <tr>
              <th className="th">{x('Evento', 'Event')}</th>
              {ROLES.map((r) => (
                <th key={r} className="th text-center">
                  {roleLabel(r)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {EVENTS.map((ev) => (
              <tr key={ev}>
                <td className="td font-medium">{e('plantilla', ev)}</td>
                {ROLES.map((r) => (
                  <td key={r} className="td text-center">
                    <div className="inline-flex">
                      <Switch checked={m[ev][r]} onChange={(v) => set(ev, r, v)} label={`${e('plantilla', ev)} · ${roleLabel(r)}`} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {EVENTS.map((ev) => (
          <div key={ev} className="card p-4">
            <div className="mb-1 text-sm font-semibold text-ink">{e('plantilla', ev)}</div>
            <div className="divide-y divide-line">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center justify-between gap-3 text-[13px] text-ink2">
                  {roleLabel(r)}
                  <Switch checked={m[ev][r]} onChange={(v) => set(ev, r, v)} label={`${e('plantilla', ev)} · ${roleLabel(r)}`} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
