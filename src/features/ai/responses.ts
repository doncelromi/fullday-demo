import type { AppState } from '@/store';
import type { Bi, Lang, Role } from '@/types';
import { byProperty, MARIELA_PROPS, metrics, occupancy, pctDelta, periodOf, top5, upcomingCheckins } from '@/data/selectors';
import { propById } from '@/data/properties';
import { TODAY } from '@/data/seed';
import { fmtARS, fmtDayLong, fmtMinAgo, fmtRange, iso } from '@/lib/format';

export interface BotAction {
  label: string; // clave i18n
  path: string;
  role?: Role;
}
export interface BotAnswer {
  text: string;
  action?: BotAction;
}

type S = Pick<AppState, 'reservas' | 'pagos' | 'propiedades' | 'resenas' | 'syncedAt' | 'plantillas'>;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

export const SUGGESTIONS: Record<Role, Bi[]> = {
  admin: [
    ['¿Cuánto facturamos este mes?', 'How much did we bill this month?'],
    ['¿Cuál es la casa más reservada?', 'Which home is the most booked?'],
    ['¿Hay calendarios con error?', 'Are there calendars with errors?'],
    ['¿Qué pagos están pendientes?', 'Which payments are pending?'],
  ],
  propietario: [
    ['¿Cuándo es mi próximo check-in?', 'When is my next check-in?'],
    ['¿Cuánto cobré este mes?', 'How much did I earn this month?'],
    ['¿Mis calendarios están sincronizados?', 'Are my calendars synced?'],
    ['¿Qué casa me rinde más?', 'Which home performs best?'],
  ],
  cliente: [
    ['¿Qué casas tienen pileta para 6?', 'Which homes have a pool for 6?'],
    ['¿Cuál es la estadía mínima?', 'What’s the minimum stay?'],
    ['¿Cómo valido mi identidad?', 'How do I verify my identity?'],
    ['¿Cómo pago?', 'How do I pay?'],
  ],
};

export const GREETING: Record<Role, Bi> = {
  admin: [
    'Hola Javier 👋 Soy el Conserje Full Day. Conozco cada casa, reserva, pago y calendario. ¿Qué querés saber?',
    'Hi Javier 👋 I’m the Full Day Concierge. I know every home, booking, payment and calendar. What would you like to know?',
  ],
  propietario: [
    'Hola Mariela 👋 Te ayudo con tus 3 casas: check-ins, cobros y la sincronización con Airbnb y Booking.',
    'Hi Mariela 👋 I can help with your 3 homes: check-ins, payouts and syncing with Airbnb and Booking.',
  ],
  cliente: [
    'Hola Sofía 👋 Soy el Conserje Full Day. Te ayudo a encontrar casa o experiencia en Chacras de Coria.',
    'Hi Sofía 👋 I’m the Full Day Concierge. I’ll help you find a home or experience in Chacras de Coria.',
  ],
};

export function answer(raw: string, role: Role, lang: Lang, s: S): BotAnswer {
  const q = norm(raw);
  const es = lang === 'es';
  const L = (a: string, b: string) => (es ? a : b);
  const money = (n: number) => fmtARS(n, lang);

  // Precio del desarrollo: nunca se dice el monto, se manda al ojito de la Propuesta
  if (has(q, 'inversion', 'presupuesto', 'cotizacion', 'investment', 'quote') || (has(q, 'precio', 'costo', 'cuesta', 'sale', 'price', 'cost') && has(q, 'desarrollo', 'plataforma', 'app', 'proyecto', 'sistema', 'demo', 'development', 'platform', 'project'))) {
    return {
      text: L('Está abajo de todo en Propuesta, tocá el ojito “Ver inversión” para verlo.', 'It’s at the very bottom of the Proposal, tap the “Show investment” eye to see it.'),
      action: { label: 'ai.goPropuesta', path: '/propuesta' },
    };
  }

  if (role === 'admin') {
    if (has(q, 'factur', 'ingres', 'vendi', 'revenue', 'bill', 'earn')) {
      const cur = metrics(s.reservas, periodOf('month'));
      const prev = metrics(s.reservas, periodOf('prev'));
      const d = pctDelta(cur.revenue, prev.revenue);
      return {
        text: L(
          `Este mes llevamos ${money(cur.revenue)} en ${cur.count} reservas (${d >= 0 ? '+' : ''}${d}% vs. el mes anterior). Ticket promedio: ${money(cur.ticket)}.`,
          `This month we’re at ${money(cur.revenue)} across ${cur.count} bookings (${d >= 0 ? '+' : ''}${d}% vs. last month). Average ticket: ${money(cur.ticket)}.`,
        ),
        action: { label: 'ai.goMetricas', path: '/admin/metricas' },
      };
    }
    if (has(q, 'mas reservada', 'top', 'ranking', 'most booked', 'mas pedida', 'mejor casa')) {
      const t = top5(s.reservas, periodOf('3m'));
      return {
        text: L(
          `${t[0].nombre} es la más reservada: ${t[0].count} reservas y ${money(t[0].revenue)} en el trimestre. Le siguen ${t[1].nombre} (${t[1].count}) y ${t[2].nombre} (${t[2].count}).`,
          `${t[0].nombre} is the most booked: ${t[0].count} bookings and ${money(t[0].revenue)} this quarter. Followed by ${t[1].nombre} (${t[1].count}) and ${t[2].nombre} (${t[2].count}).`,
        ),
        action: { label: 'ai.goMetricas', path: '/admin/metricas' },
      };
    }
    if (has(q, 'calendario', 'sincron', 'error', 'ical', 'calendar', 'sync')) {
      const errs = s.propiedades.flatMap((p) => (['airbnb', 'booking'] as const).filter((c) => p.feeds[c]?.estado === 'error').map((c) => ({ p, c, min: p.feeds[c]!.ultimaSyncMin })));
      if (!errs.length) return { text: L('Todos los calendarios están sincronizados con Airbnb y Booking. 👌', 'All calendars are in sync with Airbnb and Booking. 👌'), action: { label: 'ai.goCal', path: '/admin/calendarios' } };
      const e = errs[0];
      return {
        text: L(
          `${e.p.nombre} tiene un error de sincronización con ${e.c === 'booking' ? 'Booking' : 'Airbnb'} desde ${fmtMinAgo(e.min, lang).replace('hace ', 'hace ')}. ¿Querés que te lleve a Calendarios?`,
          `${e.p.nombre} has a sync error with ${e.c === 'booking' ? 'Booking' : 'Airbnb'} since ${fmtMinAgo(e.min, lang)}. Want me to take you to Calendars?`,
        ),
        action: { label: 'ai.goCal', path: '/admin/calendarios' },
      };
    }
    if (has(q, 'pago', 'pendiente', 'mercado', 'payment', 'pending')) {
      const pend = s.pagos.filter((p) => p.estado === 'pendiente');
      if (!pend.length) return { text: L('No hay pagos pendientes: todo acreditado. ✅', 'No pending payments: everything cleared. ✅'), action: { label: 'ai.goPagos', path: '/admin/pagos' } };
      const lines = pend.map((p) => `• ${p.id} · ${p.reservaId} · ${money(p.monto)}${p.expiraHoras ? L(` · expira en ${p.expiraHoras} h`, ` · expires in ${p.expiraHoras} h`) : ''}`).join('\n');
      return { text: L(`Hay ${pend.length} pagos pendientes:\n${lines}`, `There are ${pend.length} pending payments:\n${lines}`), action: { label: 'ai.goPagos', path: '/admin/pagos' } };
    }
    if (has(q, 'destacad', 'superanfitri', 'featured', 'superhost', 'reputacion')) {
      const homes = s.propiedades.filter((p) => p.tipo === 'alojamiento');
      const dest = s.propiedades.filter((p) => p.destacado).map((p) => p.nombre);
      const manual = s.propiedades.filter((p) => p.superSource === 'manual').map((p) => p.nombre);
      return {
        text: L(
          `Destacados (salen primero): ${dest.join(', ')}. ${homes.filter((p) => p.superanfitrion).length} de ${homes.length} casas tienen badge de Superanfitrión; ${manual.length ? `marcados a mano: ${manual.join(', ')}` : 'todos automáticos por reputación en Airbnb'}.`,
          `Featured (shown first): ${dest.join(', ')}. ${homes.filter((p) => p.superanfitrion).length} of ${homes.length} homes have the Superhost badge; ${manual.length ? `set manually: ${manual.join(', ')}` : 'all automatic from Airbnb reputation'}.`,
        ),
        action: { label: 'nav.propiedades', path: '/admin/propiedades' },
      };
    }
    if (has(q, 'whatsapp', 'mensaje', 'plantilla', 'recordatorio', 'template', 'reminder')) {
      const r = s.plantillas.find((p) => p.id === 'recordatorio')!;
      return {
        text: L(
          `Hay ${s.plantillas.length} mensajes automáticos. El recordatorio sale ${r.timing === 'inmediato' ? 'en el momento' : `${r.timing} antes del check-in`}. Los editás en Notificaciones → Plantillas, con vista previa.`,
          `There are ${s.plantillas.length} automated messages. The reminder goes out ${r.timing === 'inmediato' ? 'immediately' : `${r.timing} before check-in`}. Edit them in Notifications → Templates, with a live preview.`,
        ),
        action: { label: 'nav.notificaciones', path: '/admin/notificaciones' },
      };
    }
    if (has(q, 'check', 'llega', 'arrival', 'semana')) {
      const up = upcomingCheckins(s.reservas, 7);
      return { text: L(`En los próximos 7 días hay ${up.length} check-ins. El primero: ${up[0]?.huespedNombre} en ${propById(up[0]?.propiedadId ?? 'p-olivar').nombre}.`, `${up.length} check-ins in the next 7 days. First: ${up[0]?.huespedNombre} at ${propById(up[0]?.propiedadId ?? 'p-olivar').nombre}.`) };
    }
    if (has(q, 'ocupacion', 'occupancy')) {
      return { text: L(`La ocupación promedio del mes es ${occupancy(s.reservas, periodOf('month'))}% en las 14 casas.`, `Average occupancy this month is ${occupancy(s.reservas, periodOf('month'))}% across the 14 homes.`) };
    }
  }

  if (role === 'propietario') {
    if (has(q, 'check', 'proxim', 'llega', 'next')) {
      const up = upcomingCheckins(s.reservas, 30, MARIELA_PROPS);
      const r = up[0];
      if (!r) return { text: L('No tenés check-ins en los próximos 30 días.', 'No check-ins in the next 30 days.') };
      return {
        text: L(
          `Tu próximo check-in es ${fmtDayLong(r.checkIn, lang)} en ${propById(r.propiedadId).nombre}: ${r.huespedNombre}, ${r.huespedes} huéspedes (vía ${r.origen === 'fullday' ? 'Full Day' : r.origen === 'airbnb' ? 'Airbnb' : 'Booking'}).`,
          `Your next check-in is ${fmtDayLong(r.checkIn, lang)} at ${propById(r.propiedadId).nombre}: ${r.huespedNombre}, ${r.huespedes} guests (via ${r.origen === 'fullday' ? 'Full Day' : r.origen === 'airbnb' ? 'Airbnb' : 'Booking'}).`,
        ),
        action: { label: 'ai.goCalOwner', path: '/propietario/calendario' },
      };
    }
    if (has(q, 'cobr', 'factur', 'gane', 'earn', 'payout')) {
      const m = metrics(s.reservas, periodOf('month'), MARIELA_PROPS);
      return { text: L(`Este mes tus 3 casas facturan ${money(m.revenue)} en ${m.count} reservas y ${m.nightsSold} noches.`, `This month your 3 homes bill ${money(m.revenue)} across ${m.count} bookings and ${m.nightsSold} nights.`), action: { label: 'nav.cobros', path: '/propietario/cobros' } };
    }
    if (has(q, 'sincron', 'calendario', 'sync', 'calendar', 'airbnb', 'booking')) {
      const min = Math.max(0, Math.floor((Date.now() - s.syncedAt) / 60000));
      return {
        text: L(`Sí: Casa del Olivar, Cabaña Los Álamos y Loft Viamonte están sincronizadas con Airbnb y Booking. Última lectura ${fmtMinAgo(min, lang)}.`, `Yes: Casa del Olivar, Cabaña Los Álamos and Loft Viamonte are synced with Airbnb and Booking. Last read ${fmtMinAgo(min, lang)}.`),
        action: { label: 'ai.goCalOwner', path: '/propietario/calendario' },
      };
    }
    if (has(q, 'rinde', 'mejor', 'mas', 'best', 'perform')) {
      const bp = byProperty(s.reservas, periodOf('3m'), MARIELA_PROPS);
      return { text: L(`${bp[0].nombre} es la que más te rinde: ${money(bp[0].revenue)} en el trimestre (${bp[0].count} reservas).`, `${bp[0].nombre} performs best: ${money(bp[0].revenue)} this quarter (${bp[0].count} bookings).`), action: { label: 'nav.misMetricas', path: '/propietario/metricas' } };
    }
    if (has(q, 'resena', 'estrella', 'nota', 'review', 'rating')) {
      const mine = s.propiedades.filter((p) => MARIELA_PROPS.includes(p.id));
      const avg = mine.reduce((a, p) => a + p.rating, 0) / mine.length;
      return { text: L(`Tu nota promedio es ${avg.toFixed(2)} ★ entre tus 3 casas.`, `Your average rating is ${avg.toFixed(2)} ★ across your 3 homes.`) };
    }
  }

  if (role === 'cliente') {
    if (has(q, 'pileta', 'pool', 'piscina')) {
      const n = Number((q.match(/\d+/) ?? ['2'])[0]);
      const list = s.propiedades.filter((p) => p.tipo === 'alojamiento' && p.servicios.includes('pileta') && p.capacidad >= n);
      return {
        text: L(`Con pileta para ${n} o más: ${list.map((p) => `${p.nombre} (${money(p.precioNoche)}/noche)`).join(', ')}.`, `With a pool for ${n} or more: ${list.map((p) => `${p.nombre} (${money(p.precioNoche)}/night)`).join(', ')}.`),
        action: { label: 'ai.goExplorar', path: '/explorar' },
      };
    }
    if (has(q, 'minim', 'noches', 'minimum', 'nights')) {
      const three = s.propiedades.filter((p) => p.tipo === 'alojamiento' && p.estadiaMinima >= 3).map((p) => p.nombre);
      return { text: L(`La mayoría pide 2 noches. Piden 3: ${three.join(', ')}. Si elegís menos, te avisamos antes de seguir.`, `Most require 2 nights. These require 3: ${three.join(', ')}. If you pick fewer, we’ll tell you before continuing.`) };
    }
    if (has(q, 'identidad', 'dni', 'pasaporte', 'documento', 'identity', 'passport')) {
      return { text: L('En el paso 3 de la reserva subís foto del DNI o pasaporte (frente y dorso). Se hace una sola vez y queda en tu perfil; el anfitrión solo ve que estás validada.', 'In booking step 3 you upload a photo of your ID or passport (front and back). You only do it once and it stays on your profile; the host only sees that you’re verified.') };
    }
    if (has(q, 'pago', 'pagar', 'mercado', 'tarjeta', 'pay', 'card')) {
      return { text: L('Pagás con Mercado Pago: tarjeta de crédito, débito o dinero en cuenta. Cuando se acredita, la reserva se confirma sola y te llega un WhatsApp.', 'You pay with Mercado Pago: credit card, debit or account balance. Once it clears, the booking confirms itself and you get a WhatsApp.') };
    }
    if (has(q, 'experiencia', 'bodega', 'cabalgata', 'vino', 'experience', 'wine', 'tour')) {
      const ex = s.propiedades.filter((p) => p.tipo === 'experiencia').slice(0, 4);
      return { text: L(`Experiencias en la zona: ${ex.map((p) => `${p.nombre} (${money(p.precioNoche)}/persona)`).join(', ')}.`, `Local experiences: ${ex.map((p) => `${p.nombre} (${money(p.precioNoche)}/person)`).join(', ')}.`), action: { label: 'ai.goExplorar', path: '/explorar' } };
    }
    if (has(q, 'resena', 'opinar', 'estrella', 'review')) {
      return { text: L('Después de cada estadía, en Mis reservas → Pasadas tocás “Dejar reseña” y ponés de 1 a 5 estrellas.', 'After each stay, go to My bookings → Past and tap “Review” to give 1 to 5 stars.'), action: { label: 'nav.misReservas', path: '/mis-reservas' } };
    }
    if (has(q, 'mi reserva', 'proxima', 'next', 'my booking')) {
      const r = s.reservas.filter((x) => x.huespedId === 'g-001' && x.estado !== 'cancelada' && x.checkOut >= iso(TODAY)).sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
      if (r) return { text: L(`Tu próxima reserva: ${propById(r.propiedadId).nombre}, ${fmtRange(r.checkIn, r.checkOut, lang)} (${r.id}).`, `Your next booking: ${propById(r.propiedadId).nombre}, ${fmtRange(r.checkIn, r.checkOut, lang)} (${r.id}).`), action: { label: 'nav.misReservas', path: '/mis-reservas' } };
    }
  }

  return { text: L('No tengo esa información en la demo.', 'I don’t have that information in the demo.') };
}
