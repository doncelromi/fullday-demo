import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { AlertTriangle, ArrowRight, Bell, BellOff, CalendarCheck, CheckCheck, Clock, CreditCard, Inbox, MessageCircle, RefreshCw, Smartphone, XCircle, type LucideIcon } from 'lucide-react';
import { Badge, EstadoPill, OrigenPill, PageHeader, Photo, PreviewBanner, Segmented, Sheet, SidePanel, useMedia } from '@/components/ui';
import { useT } from '@/i18n';
import { useApp } from '@/store';
import { notifsFor } from '@/data/selectors';
import { cn } from '@/lib/utils';
import { fmtARS, fmtDate, fmtDateTime, fmtRange, fmtRelative, nights } from '@/lib/format';
import type { EstadoEntrega, Notificacion, Plantilla } from '@/types';

type NRole = 'propietario' | 'cliente';

const ICON: Record<Plantilla, LucideIcon> = {
  recibida: Inbox,
  confirmada: CalendarCheck,
  cancelada: XCircle,
  pago: CreditCard,
  recordatorio: Clock,
  sync: RefreshCw,
};
const ICON_TONE: Record<Plantilla, string> = {
  recibida: 'bg-info/10 text-info',
  confirmada: 'bg-ok/10 text-ok',
  cancelada: 'bg-danger/10 text-danger',
  pago: 'bg-accent-soft text-accent',
  recordatorio: 'bg-navy-soft text-navy',
  sync: 'bg-airbnb/10 text-airbnb',
};
const ENTREGA_TONE: Record<EstadoEntrega, 'ok' | 'info' | 'muted' | 'danger'> = { leido: 'ok', entregado: 'info', enviado: 'muted', fallido: 'danger' };

const mine = (role: NRole) => (n: Notificacion) => (role === 'propietario' ? n.destinatarioId === 'o-mariela' : n.destinatarioId === 'g-001');

/* ---------------- Mockup de WhatsApp ---------------- */
function Ticks({ estado }: { estado: EstadoEntrega }) {
  if (estado === 'fallido') return <AlertTriangle size={12} className="text-[#ef4444]" />;
  if (estado === 'enviado') return <span className="text-[11px] leading-none text-[#667781]">✓</span>;
  return <CheckCheck size={14} className={estado === 'leido' ? 'text-[#53bdeb]' : 'text-[#667781]'} />;
}

export function WhatsAppPhone({ items }: { items: Notificacion[] }) {
  const { x, e, b, lang } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const chat = useMemo(() => [...items].sort((a, c) => a.fecha.localeCompare(c.fecha)).slice(-14), [items]);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const dayLabel = (iso: string) => {
    const d = differenceInCalendarDays(new Date(), new Date(iso));
    if (d === 0) return x('HOY', 'TODAY');
    if (d === 1) return x('AYER', 'YESTERDAY');
    return fmtDate(iso, lang === 'es' ? "d 'de' MMMM" : 'MMMM d', lang).toUpperCase();
  };

  let lastDay = '';
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="rounded-[40px] border border-line-strong bg-[#111b21] p-2.5 shadow-md">
        <div className="relative overflow-hidden rounded-[32px] bg-[#efeae2] dark:bg-[#0b141a]">
          {/* status bar */}
          <div className="flex items-center justify-between bg-[#075e54] px-5 pb-1 pt-2.5 text-[10px] font-semibold text-white/90 dark:bg-[#202c33]">
            <span className="num">{fmtDate(new Date(), 'HH:mm', lang)}</span>
            <span className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-[#111b21]" />
            <span>5G ▮▮▮</span>
          </div>
          {/* header */}
          <div className="flex items-center gap-2.5 bg-[#075e54] px-3 pb-2.5 pt-1 text-white dark:bg-[#202c33]">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-black tracking-tight text-white">GO!</span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1 text-[14px] font-semibold">
                Full Day
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#25d366] text-[8px] text-white">✓</span>
              </div>
              <div className="text-[11px] text-white/75">{x('Cuenta de empresa', 'Business account')}</div>
            </div>
            <MessageCircle size={18} className="text-white/80" />
          </div>
          {/* chat */}
          <div ref={ref} className="h-[440px] space-y-1.5 overflow-y-auto px-3 py-3" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
            <div className="mx-auto mb-2 max-w-[85%] rounded-lg bg-[#fff5c4] px-2.5 py-1.5 text-center text-[10.5px] leading-snug text-[#54656f] dark:bg-[#182229] dark:text-[#ffd279]">
              🔒 {x('Mensajes automáticos de Full Day vía WhatsApp Business API.', 'Automatic Full Day messages via WhatsApp Business API.')}
            </div>
            {chat.length === 0 && <div className="py-10 text-center text-xs text-[#667781]">{x('Todavía no hay mensajes.', 'No messages yet.')}</div>}
            {chat.map((n) => {
              const dl = dayLabel(n.fecha);
              const sep = dl !== lastDay;
              lastDay = dl;
              return (
                <div key={n.id}>
                  {sep && (
                    <div className="my-2 flex justify-center">
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-[10.5px] font-medium text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">{dl}</span>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <div className="relative max-w-[86%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 pb-1 pt-1.5 text-[13px] leading-snug text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
                      <div className="text-[12px] font-bold">{e('plantilla', n.plantilla)}</div>
                      <div className="whitespace-pre-line">{b(n.texto)}</div>
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#667781] dark:text-[#8696a0]">
                        <span className="num font-normal">{fmtDate(n.fecha, 'HH:mm', lang)}</span>
                        <Ticks estado={n.estado} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* input */}
          <div className="flex items-center gap-2 bg-[#f0f2f5] px-2.5 py-2 dark:bg-[#202c33]">
            <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-[12px] text-[#8696a0] dark:bg-[#2a3942]">{x('Mensaje', 'Message')}</div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#25d366] text-white">
              <Smartphone size={14} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Centro de notificaciones ---------------- */
export function NotifCenter({ role }: { role: NRole }) {
  const { x, e, b, lang } = useT();
  const navigate = useNavigate();
  const notifs = useApp((s) => s.notifs);
  const reservas = useApp((s) => s.reservas);
  const propiedades = useApp((s) => s.propiedades);
  const marcarLeidas = useApp((s) => s.marcarLeidas);
  const marcarLeida = useApp((s) => s.marcarLeida);
  const toast = useApp((s) => s.toast);
  const isDesktop = useMedia('(min-width: 1024px)');

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [limit, setLimit] = useState(25);

  const list = useMemo(() => notifsFor(notifs, role).sort((a, c) => c.fecha.localeCompare(a.fecha)), [notifs, role]);
  const unread = list.filter((n) => !n.leida).length;
  const shown = (filter === 'unread' ? list.filter((n) => !n.leida) : list).slice(0, limit);
  const wa = useMemo(() => list.filter((n) => n.canal === 'whatsapp'), [list]);
  const sel = openId ? list.find((n) => n.id === openId) : undefined;
  const res = sel?.reservaId ? reservas.find((r) => r.id === sel.reservaId) : undefined;
  const resProp = res ? propiedades.find((p) => p.id === res.propiedadId) : undefined;

  const openN = (n: Notificacion) => {
    if (!n.leida) marcarLeida(n.id);
    setOpenId(n.id);
  };
  const markAll = () => {
    marcarLeidas(mine(role));
    toast(x('{n} notificaciones marcadas como leídas', '{n} notifications marked as read', { n: unread }));
  };
  const goRes = () => {
    if (!res) return;
    setOpenId(null);
    if (role === 'propietario') navigate('/propietario/reservas', { state: { open: res.id } });
    else navigate('/mis-reservas');
  };

  const detail = sel && (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {(() => {
          const I = ICON[sel.plantilla];
          return (
            <span className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full', ICON_TONE[sel.plantilla])}>
              <I size={18} />
            </span>
          );
        })()}
        <div className="min-w-0">
          <div className="font-semibold text-ink">{e('plantilla', sel.plantilla)}</div>
          <div className="text-xs text-muted">{fmtDateTime(sel.fecha, lang)}</div>
        </div>
      </div>
      <p className="rounded-card bg-subtle p-4 text-[15px] leading-relaxed text-ink">{b(sel.texto)}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{x('Canal', 'Channel')}</div>
          <div className="mt-1">
            <Badge tone={sel.canal === 'whatsapp' ? 'ok' : 'neutral'}>
              {sel.canal === 'whatsapp' ? <MessageCircle size={12} /> : <Bell size={12} />}
              {e('canal', sel.canal)}
            </Badge>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{x('Entrega', 'Delivery')}</div>
          <div className="mt-1">
            <Badge tone={ENTREGA_TONE[sel.estado]} dot>
              {e('entrega', sel.estado)}
            </Badge>
          </div>
        </div>
      </div>
      {res && resProp && (
        <div className="card overflow-hidden">
          <div className="flex gap-3 p-3">
            <Photo src={resProp.fotos[0]} alt={resProp.nombre} className="w-20 shrink-0 rounded-[8px]" />
            <div className="min-w-0">
              <div className="num text-xs text-ink2">{res.id}</div>
              <div className="truncate font-semibold text-ink">{resProp.nombre}</div>
              <div className="num text-[13px] text-ink2">
                {fmtRange(res.checkIn, res.checkOut, lang)} · {x('{n} noches', '{n} nights', { n: nights(res.checkIn, res.checkOut) })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              <OrigenPill v={res.origen} />
              <EstadoPill v={res.estado} />
            </div>
            {res.monto > 0 && <span className="num text-sm">{fmtARS(res.monto, lang)}</span>}
          </div>
          <button onClick={goRes} className="flex min-h-[48px] w-full items-center justify-center gap-2 border-t border-line text-sm font-semibold text-accent hover:bg-subtle">
            {role === 'propietario' ? x('Ver reserva', 'View booking') : x('Ir a mis reservas', 'Go to my bookings')}
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );

  const listCard = (
    <section className="card min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-3 sm:px-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: x('Todas', 'All'), count: list.length },
            { value: 'unread', label: x('No leídas', 'Unread'), count: unread },
          ]}
        />
        <button className="btn-ghost btn-sm" disabled={unread === 0} onClick={markAll}>
          <CheckCheck size={15} />
          {x('Marcar todo como leído', 'Mark all as read')}
        </button>
      </div>
      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-sm text-muted">
          <BellOff size={22} />
          {filter === 'unread' ? x('Estás al día: no tenés notificaciones sin leer.', 'You’re all caught up: no unread notifications.') : x('Todavía no hay notificaciones.', 'No notifications yet.')}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((n) => {
            const I = ICON[n.plantilla];
            return (
              <li key={n.id}>
                <button onClick={() => openN(n)} className={cn('flex w-full items-start gap-3 px-3 py-3.5 text-left transition hover:bg-subtle sm:px-4', !n.leida && 'bg-accent-soft/40', openId === n.id && 'bg-subtle')}>
                  <span className={cn('relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full', ICON_TONE[n.plantilla])}>
                    <I size={17} />
                    {n.canal === 'whatsapp' && (
                      <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-[#25d366]">
                        <MessageCircle size={8} className="text-white" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-sm', n.leida ? 'font-medium text-ink2' : 'font-semibold text-ink')}>{e('plantilla', n.plantilla)}</span>
                      <span className="shrink-0 text-[11px] text-muted">{fmtRelative(n.fecha, lang)}</span>
                    </span>
                    <span className={cn('mt-0.5 line-clamp-2 block text-[13px]', n.leida ? 'text-muted' : 'text-ink2')}>{b(n.texto)}</span>
                  </span>
                  <span className="flex h-10 w-3 shrink-0 items-center justify-center">{!n.leida && <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-label={x('No leída', 'Unread')} />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {limit < (filter === 'unread' ? unread : list.length) && (
        <div className="border-t border-line p-3 text-center">
          <button className="btn-ghost btn-sm" onClick={() => setLimit((l) => l + 25)}>
            {x('Ver más', 'Show more')}
          </button>
        </div>
      )}
    </section>
  );

  return (
    <>
      <PageHeader
        title={x('Notificaciones', 'Notifications')}
        subtitle={
          role === 'propietario'
            ? x('Todo lo que pasa en tus casas: reservas nuevas, pagos y avisos de sincronización, en la app y por WhatsApp.', 'Everything happening at your homes: new bookings, payments and sync alerts, in-app and on WhatsApp.')
            : x('Confirmaciones, pagos y recordatorios de tus reservas. También te llegan por WhatsApp.', 'Confirmations, payments and reminders for your bookings. You also get them on WhatsApp.')
        }
        actions={
          unread > 0 ? (
            <Badge tone="accent" className="min-h-[32px] px-3 text-xs">
              {x('{n} sin leer', '{n} unread', { n: unread })}
            </Badge>
          ) : undefined
        }
      />
      <PreviewBanner
        bullets={
          role === 'propietario'
            ? [
                x('Mariela recibe un WhatsApp automático con cada reserva confirmada, pago y alerta de sincronización.', 'Mariela gets an automatic WhatsApp for every confirmed booking, payment and sync alert.'),
                x('Mensajes enviados con plantillas aprobadas de WhatsApp Business API, con estado de entrega y lectura.', 'Messages sent with approved WhatsApp Business API templates, with delivery and read status.'),
                x('Cada aviso abre la reserva vinculada para actuar en un toque.', 'Each alert opens the linked booking so you can act in one tap.'),
              ]
            : [
                x('Sofía recibe la confirmación, el pago acreditado y el recordatorio 48 h antes del check-in.', 'Sofía gets the confirmation, the credited payment and a reminder 48 h before check-in.'),
                x('Los mismos avisos le llegan por WhatsApp, sin descargar ninguna app.', 'The same alerts reach her on WhatsApp, no app download needed.'),
                x('Tocá un aviso para ver la reserva vinculada.', 'Tap an alert to see the linked booking.'),
              ]
        }
      />

      {role === 'propietario' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {listCard}
          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="section-title">{x('Mensajes de WhatsApp recibidos', 'WhatsApp messages received')}</div>
                <div className="text-xs text-muted">{x('{n} mensajes · con estado de entrega', '{n} messages · with delivery status', { n: wa.length })}</div>
              </div>
              <Badge tone="ok">
                <MessageCircle size={12} />
                WhatsApp
              </Badge>
            </div>
            <WhatsAppPhone items={wa} />
          </aside>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">{listCard}</div>
      )}

      {isDesktop ? (
        <SidePanel open={!!sel} onClose={() => setOpenId(null)} title={x('Detalle de la notificación', 'Notification details')}>
          {detail}
        </SidePanel>
      ) : (
        <Sheet open={!!sel} onClose={() => setOpenId(null)} title={x('Detalle de la notificación', 'Notification details')}>
          {detail}
        </Sheet>
      )}
    </>
  );
}
