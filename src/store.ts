import { create } from 'zustand';
import type { Bi, Lang, Notificacion, Pago, PlantillaConfig, Propiedad, Reserva, Resena, Role, SyncLog, WebhookLog } from '@/types';
import { SEED, TODAY } from '@/data/seed';
import { ANUNCIOS, SUPER_RULE, propById } from '@/data/properties';
import { DEFAULT_PLANTILLAS, RESENAS } from '@/data/content';
import { ownerOf } from '@/data/seed';
import { firstFreeWindow } from '@/data/selectors';
import { ls, ss } from '@/lib/utils';
import { fmtDay } from '@/lib/format';

export interface Preview {
  modulo: number;
  view: string;
  rolePrevio: Role;
  titulo: Bi;
}

export interface Toast {
  id: number;
  text: string;
  kind?: 'ok' | 'info' | 'warn';
}

const savedSession: { role: Role } | null = (() => {
  const raw = ss.get('fd_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { role: Role };
  } catch {
    return null;
  }
})();

const now = () => new Date().toISOString();

export interface AppState {
  authed: boolean;
  role: Role;
  lang: Lang;
  theme: 'light' | 'dark';
  preview: Preview | null;
  moduloDestacado: number | null;
  trailer: boolean;
  tourRun: number;
  tourActive: boolean;
  toasts: Toast[];

  propiedades: Propiedad[];
  resenas: Resena[];
  plantillas: PlantillaConfig[];
  reservas: Reserva[];
  pagos: Pago[];
  webhooks: WebhookLog[];
  syncLogs: SyncLog[];
  notifs: Notificacion[];
  lastSyncMin: number;
  /** offset de minutos para "hace X min" que se reinicia al sincronizar */
  syncedAt: number;

  login: (role: Role) => void;
  logout: () => void;
  setRole: (role: Role) => void;
  setLang: (l: Lang) => void;
  toggleTheme: () => void;
  abrirPreview: (modulo: number, view: string, rol: Role, titulo: Bi) => void;
  cancelarPreview: () => void;
  cerrarPreview: () => void;
  limpiarDestacado: () => void;
  setTrailer: (v: boolean) => void;
  startTour: () => void;
  setTourActive: (v: boolean) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;

  addPropiedad: (p: Propiedad) => void;
  setDestacado: (id: string, v: boolean) => void;
  /** Override manual del badge; 'auto' vuelve a aplicar la regla de reputación de Airbnb */
  setSuperanfitrion: (id: string, mode: 'auto' | 'manual' | 'none') => void;
  addResena: (r: Resena) => void;
  updatePlantilla: (id: PlantillaConfig['id'], patch: Partial<PlantillaConfig>) => void;
  resetPlantilla: (id: PlantillaConfig['id']) => void;
  updatePropiedad: (id: string, patch: Partial<Propiedad>) => void;
  addReserva: (r: Reserva, pago?: Pago) => void;
  setIdentidad: (id: string, v: 'validada' | 'rechazada', actor: string) => void;
  cancelarReserva: (id: string, motivo: string, actor: string) => void;
  bloquearFechas: (propId: string, from: string, to: string, actor: string) => void;
  simularWebhook: () => { pagoId: string; reservaId: string } | null;
  sincronizar: () => { prop: string; from: string; to: string } | null;
  reintentarSync: (logId: string) => void;
  marcarLeidas: (filter: (n: Notificacion) => boolean) => void;
  marcarLeida: (id: string) => void;
  addNotifs: (n: Notificacion[]) => void;
}

let toastId = 1;
let nid = 10000;

export const useApp = create<AppState>((set, get) => ({
  authed: !!savedSession,
  role: savedSession?.role ?? 'admin',
  lang: (ls.get('fd_lang') as Lang) || 'es',
  theme: (ls.get('fd_theme') as 'light' | 'dark') || 'light',
  preview: null,
  moduloDestacado: null,
  trailer: false,
  tourRun: 0,
  tourActive: false,
  toasts: [],

  propiedades: ANUNCIOS,
  resenas: RESENAS,
  plantillas: DEFAULT_PLANTILLAS,
  reservas: SEED.reservas,
  pagos: SEED.pagos,
  webhooks: SEED.webhooks,
  syncLogs: SEED.syncLogs,
  notifs: SEED.notifs,
  lastSyncMin: 3,
  syncedAt: Date.now() - 3 * 60000,

  login: (role) => {
    ss.set('fd_session', JSON.stringify({ role }));
    set({ authed: true, role, preview: null });
  },
  logout: () => {
    ss.set('fd_session', null);
    ss.set('fd_welcome_seen', null);
    set({ authed: false, preview: null, tourActive: false });
  },
  setRole: (role) => {
    if (get().authed) ss.set('fd_session', JSON.stringify({ role }));
    set({ role });
  },
  setLang: (lang) => {
    ls.set('fd_lang', lang);
    document.documentElement.lang = lang;
    set({ lang });
  },
  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark';
    ls.set('fd_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.background = theme === 'dark' ? '#09090b' : '#ffffff';
    set({ theme });
  },
  abrirPreview: (modulo, view, rol, titulo) => {
    const { role, setRole } = get();
    set({ preview: { modulo, view, rolePrevio: role, titulo } });
    if (rol !== role) setRole(rol);
  },
  cancelarPreview: () => set({ preview: null }),
  cerrarPreview: () => {
    const p = get().preview;
    if (!p) return;
    if (p.rolePrevio !== get().role) get().setRole(p.rolePrevio);
    set({ preview: null, moduloDestacado: p.modulo });
  },
  limpiarDestacado: () => set({ moduloDestacado: null }),
  setTrailer: (trailer) => set({ trailer }),
  startTour: () => set((s) => ({ tourRun: s.tourRun + 1 })),
  setTourActive: (tourActive) => set({ tourActive }),
  toast: (text, kind = 'ok') => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
    setTimeout(() => get().dismissToast(id), 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  addPropiedad: (p) => set((s) => ({ propiedades: [p, ...s.propiedades] })),
  setDestacado: (id, v) => set((s) => ({ propiedades: s.propiedades.map((p) => (p.id === id ? { ...p, destacado: v } : p)) })),
  setSuperanfitrion: (id, mode) =>
    set((s) => ({
      propiedades: s.propiedades.map((p) => {
        if (p.id !== id) return p;
        const meets = p.airbnbRating >= SUPER_RULE.rating && p.airbnbResenas >= SUPER_RULE.resenas;
        if (mode === 'auto') return { ...p, superSource: meets ? 'auto' : 'none', superanfitrion: meets };
        if (mode === 'manual') return { ...p, superSource: 'manual', superanfitrion: true };
        return { ...p, superSource: 'none', superanfitrion: false };
      }),
    })),
  addResena: (r) =>
    set((s) => ({
      resenas: [r, ...s.resenas],
      propiedades: s.propiedades.map((p) =>
        p.id === r.propiedadId ? { ...p, resenas: p.resenas + 1, rating: Math.round(((p.rating * p.resenas + r.rating) / (p.resenas + 1)) * 100) / 100 } : p,
      ),
    })),
  updatePlantilla: (id, patch) =>
    set((s) => ({ plantillas: s.plantillas.map((p) => (p.id === id ? { ...p, ...patch, editada: new Date().toISOString() } : p)) })),
  resetPlantilla: (id) => set((s) => ({ plantillas: s.plantillas.map((p) => (p.id === id ? DEFAULT_PLANTILLAS.find((d) => d.id === id)! : p)) })),
  updatePropiedad: (id, patch) => set((s) => ({ propiedades: s.propiedades.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

  addReserva: (r, pago) =>
    set((s) => ({
      reservas: [r, ...s.reservas],
      pagos: pago ? [pago, ...s.pagos] : s.pagos,
    })),

  setIdentidad: (id, v, actor) =>
    set((s) => ({
      reservas: s.reservas.map((r) =>
        r.id === id
          ? {
              ...r,
              identidad: v,
              historial: [
                ...r.historial,
                { fecha: now(), texto: v === 'validada' ? ['Identidad aprobada', 'Identity approved'] : ['Identidad rechazada · se pidió un nuevo documento', 'Identity rejected · new document requested'], actor },
              ],
            }
          : r,
      ),
    })),

  cancelarReserva: (id, motivo, actor) =>
    set((s) => ({
      reservas: s.reservas.map((r) =>
        r.id === id
          ? {
              ...r,
              estado: 'cancelada',
              motivoCancelacion: motivo,
              historial: [
                ...r.historial,
                { fecha: now(), texto: [`Cancelada · ${motivo}`, `Cancelled · ${motivo}`], actor },
                { fecha: now(), texto: ['Fechas liberadas en Airbnb, Booking y Full Day', 'Dates released on Airbnb, Booking and Full Day'], actor: 'Sistema' },
              ],
            }
          : r,
      ),
    })),

  bloquearFechas: (propId, from, to, actor) =>
    set((s) => ({
      reservas: [
        {
          id: `BL-${Date.now().toString().slice(-5)}`,
          propiedadId: propId,
          huespedNombre: '—',
          origen: 'bloqueo',
          checkIn: from,
          checkOut: to,
          huespedes: 0,
          acompanantes: [],
          monto: 0,
          estado: 'confirmada',
          identidad: 'n/a',
          creada: now(),
          historial: [{ fecha: now(), texto: ['Bloqueo manual de fechas', 'Manual date block'], actor }],
          nueva: true,
        },
        ...s.reservas,
      ],
    })),

  simularWebhook: () => {
    const s = get();
    const pago = s.pagos.find((p) => p.estado === 'pendiente');
    if (!pago) return null;
    const res = s.reservas.find((r) => r.id === pago.reservaId);
    const t = now();
    const prop = res ? propById(res.propiedadId) : undefined;
    const owner = res ? ownerOf(res.propiedadId) : undefined;
    set({
      pagos: s.pagos.map((p) => (p.id === pago.id ? { ...p, estado: 'aprobado', fecha: t, expiraHoras: undefined } : p)),
      reservas: s.reservas.map((r) =>
        r.id === pago.reservaId
          ? {
              ...r,
              estado: 'confirmada',
              historial: [
                ...r.historial,
                { fecha: t, texto: ['Pago aprobado por Mercado Pago (webhook)', 'Payment approved by Mercado Pago (webhook)'], actor: 'Mercado Pago' },
                { fecha: t, texto: ['Reserva confirmada · WhatsApp enviado', 'Booking confirmed · WhatsApp sent'], actor: 'Sistema' },
                { fecha: t, texto: ['Fechas bloqueadas en Airbnb y Booking', 'Dates blocked on Airbnb and Booking'], actor: 'Sistema' },
              ],
            }
          : r,
      ),
      webhooks: [
        {
          id: `wh-${Date.now()}`,
          fecha: t,
          evento: 'payment.updated',
          pagoId: pago.id,
          estado: 'aprobado',
          reservaId: pago.reservaId,
          resultado: [`reserva ${pago.reservaId} confirmada`, `booking ${pago.reservaId} confirmed`],
          http: 200,
        },
        ...s.webhooks,
      ],
      notifs: res
        ? [
            { id: `n-${nid++}`, rol: 'cliente', destinatarioId: res.huespedId ?? '', destinatario: res.huespedNombre, plantilla: 'confirmada', canal: 'whatsapp', estado: 'entregado', leida: false, fecha: t, texto: [`¡Listo! Tu reserva en ${prop!.nombre} está confirmada.`, `Done! Your booking at ${prop!.nombre} is confirmed.`], reservaId: res.id },
            { id: `n-${nid++}`, rol: 'propietario', destinatarioId: owner!.id, destinatario: owner!.nombre, plantilla: 'confirmada', canal: 'whatsapp', estado: 'entregado', leida: false, fecha: t, texto: [`Nueva reserva confirmada en ${prop!.nombre}: ${res.huespedNombre}.`, `New confirmed booking at ${prop!.nombre}: ${res.huespedNombre}.`], reservaId: res.id },
            { id: `n-${nid++}`, rol: 'admin', destinatarioId: 'u-javier', destinatario: 'Javier Full', plantilla: 'pago', canal: 'app', estado: 'entregado', leida: false, fecha: t, texto: [`Pago acreditado ${pago.id} · ${res.id} · ${prop!.nombre}`, `Payment credited ${pago.id} · ${res.id} · ${prop!.nombre}`], reservaId: res.id },
            ...s.notifs,
          ]
        : s.notifs,
    });
    return { pagoId: pago.id, reservaId: pago.reservaId };
  },

  sincronizar: () => {
    const s = get();
    // Se "detecta" una reserva nueva de Airbnb en Casa del Olivar en la primera ventana libre
    const win = firstFreeWindow(s.reservas, 'p-olivar', 3, 34);
    const t = now();
    const already = s.syncLogs.some((l) => l.id === 'sl-new-olivar');
    set({
      lastSyncMin: 0,
      syncedAt: Date.now(),
      propiedades: s.propiedades.map((p) => ({
        ...p,
        feeds: {
          airbnb: p.feeds.airbnb && { ...p.feeds.airbnb, ultimaSyncMin: 0 },
          booking: p.feeds.booking && { ...p.feeds.booking, ultimaSyncMin: p.feeds.booking.estado === 'error' ? p.feeds.booking.ultimaSyncMin : 0 },
        },
      })),
      reservas: already
        ? s.reservas
        : [
            {
              id: 'HM8QK2TX',
              propiedadId: 'p-olivar',
              huespedNombre: 'Agustina Molina',
              huespedId: 'g-003',
              origen: 'airbnb',
              checkIn: win.from,
              checkOut: win.to,
              huespedes: 4,
              acompanantes: [],
              monto: 185000 * 3,
              estado: 'confirmada',
              identidad: 'n/a',
              creada: t,
              historial: [
                { fecha: t, texto: ['Importada desde Airbnb (iCal)', 'Imported from Airbnb (iCal)'], actor: 'Sistema' },
                { fecha: t, texto: ['Fechas bloqueadas en Full Day y Booking', 'Dates blocked on Full Day and Booking'], actor: 'Sistema' },
              ],
              nueva: true,
            },
            ...s.reservas,
          ],
      syncLogs: already
        ? [{ id: `sl-${Date.now()}`, fecha: t, propiedadId: 'p-olivar', canal: 'airbnb', nivel: 'ok', texto: ['Feed leído · sin cambios', 'Feed read · no changes'] }, ...s.syncLogs]
        : [
            { id: 'sl-new-olivar', fecha: t, propiedadId: 'p-olivar', canal: 'airbnb', nivel: 'info', texto: [`1 reserva nueva importada (${fmtDay(win.from, 'es')} → ${fmtDay(win.to, 'es')}) · fechas bloqueadas en Booking y Full Day`, `1 new booking imported (${fmtDay(win.from, 'en')} → ${fmtDay(win.to, 'en')}) · dates blocked on Booking and Full Day`] },
            ...s.syncLogs,
          ],
      notifs: already
        ? s.notifs
        : [
            { id: `n-${nid++}`, rol: 'propietario', destinatarioId: 'o-mariela', destinatario: 'Mariela Ruiz', plantilla: 'sync', canal: 'whatsapp', estado: 'entregado', leida: false, fecha: t, texto: ['Entró una reserva de Airbnb en Casa del Olivar. Bloqueamos las fechas en Booking y Full Day.', 'An Airbnb booking came in for Casa del Olivar. We blocked the dates on Booking and Full Day.'] },
            ...s.notifs,
          ],
    });
    return already ? null : { prop: 'Casa del Olivar', from: win.from, to: win.to };
  },

  reintentarSync: (logId) => {
    const s = get();
    const log = s.syncLogs.find((l) => l.id === logId);
    if (!log) return;
    set({
      syncLogs: [
        { id: `sl-${Date.now()}`, fecha: now(), propiedadId: log.propiedadId, canal: log.canal, nivel: 'ok', texto: ['Reintento manual · feed leído correctamente', 'Manual retry · feed read successfully'] },
        ...s.syncLogs.map((l) => (l.id === logId ? { ...l, resuelto: true } : l)),
      ],
      propiedades: s.propiedades.map((p) =>
        p.id === log.propiedadId && p.feeds[log.canal]
          ? { ...p, feeds: { ...p.feeds, [log.canal]: { ...p.feeds[log.canal]!, estado: 'ok', ultimaSyncMin: 0, error: undefined } } }
          : p,
      ),
    });
  },

  marcarLeidas: (filter) => set((s) => ({ notifs: s.notifs.map((n) => (filter(n) ? { ...n, leida: true } : n)) })),
  marcarLeida: (id) => set((s) => ({ notifs: s.notifs.map((n) => (n.id === id ? { ...n, leida: true } : n)) })),
  addNotifs: (n) => set((s) => ({ notifs: [...n, ...s.notifs] })),
}));

export { TODAY };
