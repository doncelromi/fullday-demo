import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  isWithinInterval,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import type { Origen, Reserva } from '@/types';
import { iso } from '@/lib/format';
import { PROPIEDADES, propById } from './properties';
import { TODAY } from './seed';

export const activeRes = (r: Reserva) => r.estado !== 'cancelada';
export const revenueRes = (r: Reserva) => r.estado !== 'cancelada' && r.origen !== 'bloqueo';

export interface Period {
  from: Date;
  to: Date; // inclusivo
}

export const periodOf = (key: string, custom?: Period): Period => {
  const m0 = startOfMonth(TODAY);
  switch (key) {
    case 'prev':
      return { from: startOfMonth(subMonths(m0, 1)), to: endOfMonth(subMonths(m0, 1)) };
    case '3m':
      return { from: startOfMonth(subMonths(m0, 2)), to: endOfMonth(m0) };
    case '12m':
      return { from: startOfMonth(subMonths(m0, 11)), to: endOfMonth(m0) };
    case 'custom':
      return custom ?? { from: m0, to: endOfMonth(m0) };
    default:
      return { from: m0, to: endOfMonth(m0) };
  }
};

/** Período inmediatamente anterior de igual duración */
export const previousPeriod = (p: Period): Period => {
  const days = differenceInCalendarDays(p.to, p.from) + 1;
  if (p.from.getDate() === 1 && days >= 28) {
    const months = Math.round(days / 30.4);
    return { from: startOfMonth(subMonths(p.from, months)), to: endOfMonth(subMonths(p.from, 1)) };
  }
  return { from: addDays(p.from, -days), to: addDays(p.from, -1) };
};

const inPeriod = (r: Reserva, p: Period) => isWithinInterval(parseISO(r.checkIn), { start: p.from, end: p.to });

const scope = (rs: Reserva[], propIds?: string[]) => (propIds ? rs.filter((r) => propIds.includes(r.propiedadId)) : rs);

export function metrics(rs: Reserva[], p: Period, propIds?: string[]) {
  const list = scope(rs, propIds).filter((r) => revenueRes(r) && inPeriod(r, p));
  const revenue = list.reduce((a, r) => a + r.monto, 0);
  const nightsSold = list.reduce((a, r) => a + differenceInCalendarDays(parseISO(r.checkOut), parseISO(r.checkIn)), 0);
  return { revenue, count: list.length, nightsSold, ticket: list.length ? Math.round(revenue / list.length) : 0, list };
}

export function occupancy(rs: Reserva[], p: Period, propIds?: string[]) {
  const ids = propIds ?? PROPIEDADES.map((x) => x.id);
  const days = differenceInCalendarDays(p.to, p.from) + 1;
  let booked = 0;
  for (const r of scope(rs, ids)) {
    if (!activeRes(r)) continue;
    const a = maxDate([parseISO(r.checkIn), p.from]);
    const b = minDate([parseISO(r.checkOut), addDays(p.to, 1)]);
    const n = differenceInCalendarDays(b, a);
    if (n > 0) booked += n;
  }
  return Math.round((booked / (days * ids.length)) * 100);
}

export function occupancyByProp(rs: Reserva[], p: Period) {
  return Object.fromEntries(PROPIEDADES.map((x) => [x.id, occupancy(rs, p, [x.id])]));
}

export function revenueByMonth(rs: Reserva[], months = 6, propIds?: string[]) {
  return Array.from({ length: months }, (_, i) => {
    const m = startOfMonth(subMonths(TODAY, months - 1 - i));
    const per = { from: m, to: endOfMonth(m) };
    return { month: m, revenue: metrics(rs, per, propIds).revenue, count: metrics(rs, per, propIds).count };
  });
}

export function byProperty(rs: Reserva[], p: Period, propIds?: string[]) {
  const ids = propIds ?? PROPIEDADES.map((x) => x.id);
  return ids
    .map((id) => {
      const m = metrics(rs, p, [id]);
      return { id, nombre: propById(id).nombre, revenue: m.revenue, count: m.count, nights: m.nightsSold };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function top5(rs: Reserva[], p: Period, propIds?: string[]) {
  return byProperty(rs, p, propIds)
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
    .slice(0, 5);
}

export function originMix(rs: Reserva[], p: Period, propIds?: string[]) {
  const list = scope(rs, propIds).filter((r) => revenueRes(r) && inPeriod(r, p));
  const o: Origen[] = ['fullday', 'airbnb', 'booking'];
  return o.map((k) => ({ key: k, value: list.filter((r) => r.origen === k).length }));
}

export function upcomingCheckins(rs: Reserva[], days = 7, propIds?: string[]) {
  const end = addDays(TODAY, days);
  return scope(rs, propIds)
    .filter((r) => activeRes(r) && r.origen !== 'bloqueo')
    .filter((r) => {
      const d = parseISO(r.checkIn);
      return d >= TODAY && d <= end;
    })
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

/** Días ocupados (noches) de una propiedad, para tachar en calendarios */
export function bookedDays(rs: Reserva[], propId: string): Date[] {
  const out: Date[] = [];
  for (const r of rs) {
    if (r.propiedadId !== propId || !activeRes(r)) continue;
    const a = parseISO(r.checkIn);
    const b = addDays(parseISO(r.checkOut), -1);
    if (b < a) continue;
    out.push(...eachDayOfInterval({ start: a, end: b }));
  }
  return out;
}

export function isRangeFree(rs: Reserva[], propId: string, from: string, to: string, ignoreId?: string) {
  return !rs.some((r) => r.propiedadId === propId && activeRes(r) && r.id !== ignoreId && from < r.checkOut && to > r.checkIn);
}

/** Primera ventana libre de n noches a partir de `fromOffset` días */
export function firstFreeWindow(rs: Reserva[], propId: string, n: number, fromOffset = 10) {
  for (let s = fromOffset; s < fromOffset + 120; s++) {
    const a = iso(addDays(TODAY, s));
    const b = iso(addDays(TODAY, s + n));
    if (isRangeFree(rs, propId, a, b)) return { from: a, to: b };
  }
  return { from: iso(addDays(TODAY, fromOffset)), to: iso(addDays(TODAY, fromOffset + n)) };
}

export const pctDelta = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : 0);

/** Notificaciones visibles para cada rol de la demo */
export const notifsFor = <N extends { rol: string; destinatarioId: string }>(ns: N[], role: 'admin' | 'propietario' | 'cliente') =>
  ns.filter((n) => (role === 'admin' ? n.rol === 'admin' : role === 'propietario' ? n.destinatarioId === 'o-mariela' : n.destinatarioId === 'g-001'));

export const MARIELA_PROPS = ['p-olivar', 'p-alamos', 'p-viamonte'];
