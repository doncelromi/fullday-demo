import { addDays, addHours, addMinutes, differenceInCalendarDays, startOfDay, subDays, subHours, subMinutes } from 'date-fns';
import type { EventoEstado, MedioPago, Notificacion, Origen, Pago, Reserva, SyncLog, WebhookLog } from '@/types';
import { iso } from '@/lib/format';
import { rng } from '@/lib/utils';
import { EXPERIENCIAS, PROPIEDADES, propById } from './properties';
import { HUESPEDES, PROPIETARIOS, propietarioById } from './users';

/**
 * Generador determinístico de ~6 meses de operación, relativo a HOY,
 * para que "próximos 7 días", "este mes" y las cuentas regresivas siempre tengan sentido.
 */
export const TODAY = startOfDay(new Date());
const r = rng(20261009);
const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));

const HIST_START = -165; // días
const HORIZON = 80;

// Densidad por propiedad: [ocupación objetivo, estadía mín, estadía máx]
const DENSITY: Record<string, [number, number, number]> = {
  'p-olivar': [0.8, 2, 4],
  'p-viamonte': [0.66, 2, 4],
  'p-tipas': [0.72, 3, 4],
  'p-alamos': [0.62, 2, 4],
  'p-italia': [0.62, 3, 4],
  'p-cerroarco': [0.36, 2, 5],
  'p-glorieta': [0.38, 2, 5],
  'p-malbec': [0.44, 3, 6],
  'p-nogales': [0.4, 3, 6],
  'p-estudio': [0.42, 2, 5],
  'p-lavanda': [0.42, 2, 5],
  'p-aljibe': [0.38, 3, 6],
  'p-membrillos': [0.36, 2, 5],
  'p-torreon': [0.2, 2, 4],
};

interface Raw {
  propiedadId: string;
  s: number; // offset día
  n: number; // noches
  origen: Origen;
  huespedId?: string;
  forced?: Partial<Reserva> & { tag?: string };
}

const raws: Raw[] = [];
const busy: Record<string, [number, number][]> = {};
const overlaps = (pid: string, s: number, e: number) => (busy[pid] ?? []).some(([a, b]) => s < b && e > a);
const occupy = (pid: string, s: number, e: number) => (busy[pid] ??= []).push([s, e]);

// --- Reservas guionadas (edge cases y la historia de Sofía) ---
const scripted: Raw[] = [
  // Sofía Benítez: 2 pasadas, 1 próxima, 1 cancelada
  { propiedadId: 'p-italia', s: -120, n: 4, origen: 'fullday', huespedId: 'g-001', forced: { tag: 'sofia1' } },
  { propiedadId: 'p-viamonte', s: -48, n: 3, origen: 'fullday', huespedId: 'g-001', forced: { tag: 'sofia2' } },
  { propiedadId: 'p-tipas', s: 21, n: 4, origen: 'fullday', huespedId: 'g-001', forced: { tag: 'sofia3' } },
  { propiedadId: 'p-lavanda', s: -75, n: 2, origen: 'fullday', huespedId: 'g-001', forced: { tag: 'sofiaCancel' } },
  // FD-1043: identidad en revisión, check-in en 3 días
  { propiedadId: 'p-italia', s: 3, n: 4, origen: 'fullday', huespedId: 'g-006', forced: { tag: 'FD-1043' } },
  // FD-1052: pago pendiente (lo confirma "Simular webhook")
  { propiedadId: 'p-glorieta', s: 12, n: 3, origen: 'fullday', huespedId: 'g-012', forced: { tag: 'FD-1052' } },
  // MP-88213: pago pendiente que expira en 6 h
  { propiedadId: 'p-malbec', s: 16, n: 3, origen: 'fullday', huespedId: 'g-005', forced: { tag: 'MP-88213' } },
  // Otra pendiente más
  { propiedadId: 'p-cerroarco', s: 26, n: 2, origen: 'fullday', huespedId: 'g-018', forced: { tag: 'pend3' } },
  // Check-ins próximos de Mariela, para que su panel tenga vida
  { propiedadId: 'p-olivar', s: 1, n: 3, origen: 'fullday', huespedId: 'g-002' },
  { propiedadId: 'p-alamos', s: 2, n: 4, origen: 'airbnb', huespedId: 'g-007' },
  { propiedadId: 'p-viamonte', s: 4, n: 2, origen: 'booking', huespedId: 'g-016' },
  // Sofía reservó también una experiencia durante su estadía en Las Tipas
  { propiedadId: 'x-degustacion', s: 22, n: 1, origen: 'fullday', huespedId: 'g-001', forced: { tag: 'sofiaExp' } },
  // Bloqueo manual de Mariela
  { propiedadId: 'p-alamos', s: 30, n: 3, origen: 'bloqueo' },
];
for (const sc of scripted) {
  occupy(sc.propiedadId, sc.s, sc.s + sc.n);
  raws.push(sc);
}

// --- Relleno por propiedad ---
const originPick = (x: number): Origen => {
  if (x < 0.46) return 'fullday';
  if (x < 0.81) return 'airbnb';
  if (x < 0.985) return 'booking';
  return 'bloqueo';
};
PROPIEDADES.forEach((p, pi) => {
  // RNG propio por propiedad: ajustar una no altera a las demás
  const r = rng(1000 + pi * 7);
  const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const [occ, mn, mx] = DENSITY[p.id];
  let day = HIST_START + ri(0, 6);
  while (day < HORIZON) {
    const progress = Math.min(1, Math.max(0, (day - HIST_START) / -HIST_START));
    let f = 0.62 + 0.38 * progress;
    if (day > 28) f *= Math.max(0.25, 1 - (day - 28) / 60); // lo lejano todavía no se reservó
    const stay = ri(mn, mx);
    const avgGap = stay * (1 / Math.min(0.97, occ * f) - 1);
    day += Math.max(0, Math.round(avgGap * (0.35 + r() * 1.3)));
    let tries = 0;
    while (overlaps(p.id, day, day + stay) && tries++ < 40) day += 1;
    if (day >= HORIZON) break;
    if (!overlaps(p.id, day, day + stay)) {
      occupy(p.id, day, day + stay);
      const origen = p.feeds.booking || p.feeds.airbnb ? originPick(r()) : 'fullday';
      const valid: Origen = origen === 'airbnb' && !p.feeds.airbnb ? 'booking' : origen === 'booking' && !p.feeds.booking ? 'airbnb' : origen;
      raws.push({ propiedadId: p.id, s: day, n: stay, origen: valid, huespedId: valid === 'bloqueo' ? undefined : HUESPEDES[1 + Math.floor(r() * (HUESPEDES.length - 1))].id });
    }
    day += stay;
  }
});

// Experiencias: grupos sueltos (varios por día posibles), solo por Full Day
EXPERIENCIAS.forEach((x, xi) => {
  const r = rng(5000 + xi * 13);
  for (let d = -150 + Math.floor(r() * 5); d < 40; d += 6 + Math.floor(r() * (xi < 2 ? 8 : 14))) {
    raws.push({ propiedadId: x.id, s: d, n: 1, origen: 'fullday', huespedId: HUESPEDES[1 + Math.floor(r() * (HUESPEDES.length - 1))].id });
  }
});

raws.sort((a, b) => a.s - b.s || a.propiedadId.localeCompare(b.propiedadId));

// --- Materialización ---
const NOW = new Date();
const ADMIN_ACTOR = 'Sistema';
const reservas: Reserva[] = [];
const pagos: Pago[] = [];
let fd = 1001;
let ext = 4100;
const usedMp = new Set<number>([88213, 88301]);
const mpId = () => {
  let n: number;
  do n = ri(87000, 88990);
  while (usedMp.has(n));
  usedMp.add(n);
  return `MP-${n}`;
};
const medioPick = (): MedioPago => {
  const x = r();
  return x < 0.52 ? 'tarjeta' : x < 0.78 ? 'dinero_cuenta' : x < 0.95 ? 'debito' : 'efectivo';
};

for (const raw of raws) {
  const p = propById(raw.propiedadId);
  const checkIn = addDays(TODAY, raw.s);
  const checkOut = addDays(TODAY, raw.s + raw.n);
  const guest = HUESPEDES.find((h) => h.id === raw.huespedId);
  const tag = raw.forced?.tag;
  const leadDays = raw.s > 0 ? Math.min(ri(3, 40), raw.s + 20) : ri(4, 45);
  let creada = subDays(checkIn, leadDays);
  if (creada > NOW) creada = subHours(NOW, ri(2, 30));
  const personas = Math.min(p.capacidad, raw.origen === 'bloqueo' ? 0 : ri(Math.min(2, p.capacidad), p.tipo === 'experiencia' ? 4 : p.capacidad));
  const monto = raw.origen === 'bloqueo' ? 0 : p.tipo === 'experiencia' ? p.precioNoche * personas : p.precioNoche * raw.n;

  let estado: Reserva['estado'];
  if (raw.s + raw.n <= 0) estado = 'finalizada';
  else estado = 'confirmada';
  if (raw.origen !== 'bloqueo' && raw.s < -5 && r() < 0.05) estado = 'cancelada';
  if (tag === 'sofiaCancel') estado = 'cancelada';
  const pending = tag === 'FD-1052' || tag === 'MP-88213' || tag === 'pend3';
  if (pending) {
    estado = 'pendiente';
    creada = subHours(NOW, tag === 'MP-88213' ? 18 : ri(3, 20));
  }

  let identidad: Reserva['identidad'] = 'n/a';
  if (raw.origen === 'fullday') identidad = tag === 'FD-1043' ? 'revision' : pending ? (tag === 'pend3' ? 'revision' : 'validada') : 'validada';

  let id: string;
  if (raw.origen === 'fullday') id = `FD-${fd++}`;
  else if (raw.origen === 'airbnb') id = `HM${(ext++ * 7919).toString(36).toUpperCase().slice(-6)}`;
  else if (raw.origen === 'booking') id = `BK-${(ext++ * 104729).toString().slice(-9)}`;
  else id = `BL-${ext++}`;

  const hist: EventoEstado[] = [];
  const c = creada.toISOString();
  const name = guest?.nombre ?? '—';
  if (raw.origen === 'fullday') {
    hist.push({ fecha: c, texto: ['Reserva creada · fechas bloqueadas 15 min', 'Booking created · dates held 15 min'], actor: name });
    hist.push({ fecha: addMinutes(creada, 4).toISOString(), texto: ['Documento de identidad cargado', 'ID document uploaded'], actor: name });
    if (identidad === 'validada') hist.push({ fecha: addMinutes(creada, 40).toISOString(), texto: ['Identidad validada', 'Identity verified'], actor: 'Javier Full' });
    if (!pending && estado !== 'cancelada') {
      hist.push({ fecha: addMinutes(creada, 7).toISOString(), texto: ['Pago aprobado por Mercado Pago (webhook)', 'Payment approved by Mercado Pago (webhook)'], actor: 'Mercado Pago' });
      hist.push({ fecha: addMinutes(creada, 7).toISOString(), texto: ['Reserva confirmada · WhatsApp enviado', 'Booking confirmed · WhatsApp sent'], actor: ADMIN_ACTOR });
      hist.push({ fecha: addMinutes(creada, 8).toISOString(), texto: ['Fechas bloqueadas en Airbnb y Booking', 'Dates blocked on Airbnb and Booking'], actor: ADMIN_ACTOR });
    }
  } else if (raw.origen === 'bloqueo') {
    hist.push({ fecha: c, texto: ['Bloqueo manual de fechas', 'Manual date block'], actor: propietarioById(p.propietarioId).nombre });
  } else {
    const canal = raw.origen === 'airbnb' ? 'Airbnb' : 'Booking';
    hist.push({ fecha: c, texto: [`Importada desde ${canal} (iCal)`, `Imported from ${canal} (iCal)`], actor: ADMIN_ACTOR });
    hist.push({ fecha: addMinutes(creada, 1).toISOString(), texto: ['Fechas bloqueadas en Full Day y en el resto de los canales', 'Dates blocked on Full Day and the other channels'], actor: ADMIN_ACTOR });
  }
  if (estado === 'finalizada') hist.push({ fecha: addHours(checkOut, 10).toISOString(), texto: ['Check-out · estadía finalizada', 'Check-out · stay completed'], actor: ADMIN_ACTOR });
  if (estado === 'cancelada')
    hist.push({ fecha: addDays(creada, 2).toISOString(), texto: ['Cancelada por el huésped · cambio de planes', 'Cancelled by guest · change of plans'], actor: name });

  const res: Reserva = {
    id,
    propiedadId: p.id,
    huespedId: guest?.id,
    huespedNombre: raw.origen === 'bloqueo' ? '—' : name,
    origen: raw.origen,
    checkIn: iso(checkIn),
    checkOut: iso(checkOut),
    huespedes: personas,
    acompanantes: [],
    monto,
    estado,
    identidad,
    creada: c,
    historial: hist,
    motivoCancelacion: estado === 'cancelada' ? 'Cambio de planes' : undefined,
  };
  if (res.huespedes > 1 && raw.origen === 'fullday') {
    const comp = ['Julián', 'Carla', 'Mateo', 'Lucía', 'Bruno', 'Abril', 'Tadeo', 'Olivia'];
    res.acompanantes = Array.from({ length: Math.min(3, res.huespedes - 1) }, (_, i) => ({
      nombre: `${comp[(fd + i) % comp.length]} ${name.split(' ').slice(-1)[0]}`,
      dni: `${ri(30, 46)}.${ri(100, 999)}.${ri(100, 999)}`,
    }));
  }

  // Pago Mercado Pago (solo reservas Full Day)
  if (raw.origen === 'fullday') {
    let pid = mpId();
    let pest: Pago['estado'] = 'aprobado';
    let expira: number | undefined;
    if (tag === 'FD-1052') {
      pid = 'MP-88301';
      pest = 'pendiente';
      expira = 20;
    } else if (tag === 'MP-88213') {
      pid = 'MP-88213';
      pest = 'pendiente';
      expira = 6;
    } else if (tag === 'pend3') {
      pest = 'pendiente';
      expira = 30;
    } else if (estado === 'cancelada') pest = r() < 0.5 ? 'rechazado' : 'expirado';
    res.pagoId = pid;
    pagos.push({ id: pid, reservaId: id, monto, medio: medioPick(), estado: pest, fecha: addMinutes(creada, 7).toISOString(), expiraHoras: expira });
  }
  if (tag) (res as Reserva & { tag?: string }).tag = tag;
  reservas.push(res);
}

// Etiquetas pedidas por el guion: FD-1043 y FD-1052 (se intercambian ids con la reserva que los tenía)
function relabel(tag: string, wanted: string) {
  const a = reservas.find((x) => (x as Reserva & { tag?: string }).tag === tag);
  const b = reservas.find((x) => x.id === wanted);
  if (!a || !b || a === b) return;
  const old = a.id;
  b.id = old;
  a.id = wanted;
  pagos.forEach((p) => {
    if (p.reservaId === wanted) p.reservaId = '__tmp';
  });
  pagos.forEach((p) => {
    if (p.reservaId === old) p.reservaId = wanted;
  });
  pagos.forEach((p) => {
    if (p.reservaId === '__tmp') p.reservaId = old;
  });
}
relabel('FD-1043', 'FD-1043');
relabel('FD-1052', 'FD-1052');
reservas.forEach((x) => delete (x as Reserva & { tag?: string }).tag);

// --- Webhooks recibidos (log técnico) ---
const approved = pagos
  .filter((p) => p.estado === 'aprobado')
  .sort((a, b) => b.fecha.localeCompare(a.fecha))
  .slice(0, 9);
const webhooks: WebhookLog[] = approved.map((p, i) => ({
  id: `wh-${i}`,
  fecha: p.fecha,
  evento: 'payment.updated',
  pagoId: p.id,
  estado: 'aprobado',
  reservaId: p.reservaId,
  resultado: [`reserva ${p.reservaId} confirmada`, `booking ${p.reservaId} confirmed`],
  http: 200,
}));
const rej = pagos.find((p) => p.estado === 'rechazado');
if (rej)
  webhooks.splice(3, 0, {
    id: 'wh-rej',
    fecha: rej.fecha,
    evento: 'payment.updated',
    pagoId: rej.id,
    estado: 'rechazado',
    reservaId: rej.reservaId,
    resultado: [`reserva ${rej.reservaId} liberada · fechas desbloqueadas`, `booking ${rej.reservaId} released · dates unblocked`],
    http: 200,
  });
webhooks.sort((a, b) => b.fecha.localeCompare(a.fecha));

// --- Log de sincronización iCal ---
const syncLogs: SyncLog[] = [
  { id: 'sl-1', fecha: subMinutes(NOW, 124).toISOString(), propiedadId: 'p-tipas', canal: 'booking', nivel: 'error', texto: ['Tiempo de espera agotado · 3 reintentos', 'Request timed out · 3 retries'], reintentos: 3 },
  { id: 'sl-2', fecha: subMinutes(NOW, 3).toISOString(), propiedadId: 'p-olivar', canal: 'airbnb', nivel: 'ok', texto: ['Feed leído · sin cambios', 'Feed read · no changes'] },
  { id: 'sl-3', fecha: subMinutes(NOW, 4).toISOString(), propiedadId: 'p-italia', canal: 'booking', nivel: 'ok', texto: ['Feed leído · sin cambios', 'Feed read · no changes'] },
  { id: 'sl-4', fecha: subMinutes(NOW, 38).toISOString(), propiedadId: 'p-alamos', canal: 'airbnb', nivel: 'info', texto: ['1 reserva nueva importada · fechas bloqueadas en Booking y Full Day', '1 new booking imported · dates blocked on Booking and Full Day'] },
  { id: 'sl-5', fecha: subHours(NOW, 26).toISOString(), propiedadId: 'p-nogales', canal: 'booking', nivel: 'error', texto: ['Respuesta 503 de Booking · resuelto en el reintento 2', 'Booking returned 503 · resolved on retry 2'], reintentos: 2, resuelto: true },
];

// --- Notificaciones (WhatsApp + app) ---
const notifs: Notificacion[] = [];
let nid = 1;
const recent = reservas
  .filter((x) => x.origen === 'fullday' && differenceInCalendarDays(NOW, new Date(x.creada)) <= 40)
  .sort((a, b) => b.creada.localeCompare(a.creada));
const delivery = (): Notificacion['estado'] => {
  const x = r();
  return x < 0.62 ? 'leido' : x < 0.9 ? 'entregado' : x < 0.97 ? 'enviado' : 'fallido';
};
for (const res of recent) {
  const p = propById(res.propiedadId);
  const owner = propietarioById(p.propietarioId);
  const g = HUESPEDES.find((h) => h.id === res.huespedId);
  const base = { reservaId: res.id };
  const f0 = new Date(res.creada);
  if (g)
    notifs.push({ id: `n-${nid++}`, rol: 'cliente', destinatarioId: g.id, destinatario: g.nombre, plantilla: 'recibida', canal: 'whatsapp', estado: delivery(), leida: true, fecha: addMinutes(f0, 1).toISOString(), texto: [`Recibimos tu reserva ${res.id} en ${p.nombre}.`, `We received your booking ${res.id} at ${p.nombre}.`], ...base });
  if (res.estado !== 'pendiente' && res.estado !== 'cancelada') {
    if (g)
      notifs.push({ id: `n-${nid++}`, rol: 'cliente', destinatarioId: g.id, destinatario: g.nombre, plantilla: 'confirmada', canal: 'whatsapp', estado: delivery(), leida: true, fecha: addMinutes(f0, 8).toISOString(), texto: [`¡Listo! Tu reserva en ${p.nombre} está confirmada.`, `Done! Your booking at ${p.nombre} is confirmed.`], ...base });
    notifs.push({ id: `n-${nid++}`, rol: 'propietario', destinatarioId: owner.id, destinatario: owner.nombre, plantilla: 'confirmada', canal: 'whatsapp', estado: delivery(), leida: differenceInCalendarDays(NOW, f0) > 2, fecha: addMinutes(f0, 8).toISOString(), texto: [`Nueva reserva confirmada en ${p.nombre}: ${res.huespedNombre}, ${res.huespedes} huéspedes.`, `New confirmed booking at ${p.nombre}: ${res.huespedNombre}, ${res.huespedes} guests.`], ...base });
    notifs.push({ id: `n-${nid++}`, rol: 'admin', destinatarioId: 'u-javier', destinatario: 'Javier Full', plantilla: 'pago', canal: 'app', estado: 'entregado', leida: differenceInCalendarDays(NOW, f0) > 1, fecha: addMinutes(f0, 7).toISOString(), texto: [`Pago acreditado ${res.pagoId} · ${res.id} · ${p.nombre}`, `Payment credited ${res.pagoId} · ${res.id} · ${p.nombre}`], ...base });
  }
  const ci = addDays(new Date(res.checkIn + 'T12:00:00'), -2);
  if (g && ci < NOW && res.estado !== 'cancelada' && res.estado !== 'pendiente')
    notifs.push({ id: `n-${nid++}`, rol: 'cliente', destinatarioId: g.id, destinatario: g.nombre, plantilla: 'recordatorio', canal: 'whatsapp', estado: delivery(), leida: true, fecha: ci.toISOString(), texto: [`Faltan 48 h para tu check-in en ${p.nombre}. Dirección y acceso en la app.`, `48 h until your check-in at ${p.nombre}. Address and access in the app.`], ...base });
}
// Avisos de sincronización / alertas para admin y Mariela
notifs.push({ id: `n-${nid++}`, rol: 'admin', destinatarioId: 'u-javier', destinatario: 'Javier Full', plantilla: 'sync', canal: 'app', estado: 'entregado', leida: false, fecha: subMinutes(NOW, 120).toISOString(), texto: ['Finca Las Tipas · error de sincronización con Booking', 'Finca Las Tipas · sync error with Booking'] });
notifs.push({ id: `n-${nid++}`, rol: 'propietario', destinatarioId: 'o-mariela', destinatario: 'Mariela Ruiz', plantilla: 'sync', canal: 'whatsapp', estado: 'leido', leida: false, fecha: subMinutes(NOW, 38).toISOString(), texto: ['Entró una reserva de Airbnb en Cabaña Los Álamos. Bloqueamos las fechas en Booking y Full Day.', 'An Airbnb booking came in for Cabaña Los Álamos. We blocked the dates on Booking and Full Day.'] });
notifs.sort((a, b) => b.fecha.localeCompare(a.fecha));

export const SEED = {
  reservas,
  pagos,
  webhooks,
  syncLogs,
  notifs,
};

export const ownerOf = (propiedadId: string) => propietarioById(propById(propiedadId).propietarioId);
export const PROPS_OF = (ownerId: string) => PROPIETARIOS.find((o) => o.id === ownerId)?.propiedades ?? [];
