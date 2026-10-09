import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO, type Locale } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import type { Lang } from '@/types';

export const locale = (lang: Lang): Locale => (lang === 'es' ? es : enUS);

/** ARS: es → "$ 185.000" · en → "ARS 185,000" */
export const fmtARS = (n: number, lang: Lang = 'es') =>
  lang === 'es' ? '$ ' + Math.round(n).toLocaleString('es-AR') : 'ARS ' + Math.round(n).toLocaleString('en-US');

export const fmtARSShort = (n: number, lang: Lang = 'es') => {
  const sep = lang === 'es' ? 'es-AR' : 'en-US';
  const p = lang === 'es' ? '$ ' : 'ARS ';
  if (n >= 1_000_000) return `${p}${(n / 1_000_000).toLocaleString(sep, { maximumFractionDigits: 1 })}M`;
  if (n >= 1000) return `${p}${Math.round(n / 1000)}k`;
  return fmtARS(n, lang);
};

export const fmtUSD = (n: number) => 'USD ' + n.toLocaleString('es-AR');

export const fmtNum = (n: number, lang: Lang) => n.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US');

export const toDate = (d: Date | string) => (typeof d === 'string' ? (d.length === 10 ? parseISO(d) : new Date(d)) : d);

export const fmtDate = (d: Date | string, pattern: string, lang: Lang) => format(toDate(d), pattern, { locale: locale(lang) });

/** "14 nov" / "Nov 14" */
export const fmtDay = (d: Date | string, lang: Lang) => fmtDate(d, lang === 'es' ? 'd MMM' : 'MMM d', lang);
/** "vie 14 nov" */
export const fmtDayLong = (d: Date | string, lang: Lang) => fmtDate(d, lang === 'es' ? 'EEE d MMM' : 'EEE, MMM d', lang);
/** "14 nov, 10:32" */
export const fmtDateTime = (d: Date | string, lang: Lang) => fmtDate(d, lang === 'es' ? "d MMM, HH:mm" : 'MMM d, HH:mm', lang);

export const fmtRange = (a: string, b: string, lang: Lang) => `${fmtDay(a, lang)} → ${fmtDay(b, lang)}`;

export const fmtRelative = (d: Date | string, lang: Lang) =>
  formatDistanceToNowStrict(toDate(d), { locale: locale(lang), addSuffix: true });

export const nights = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a));

export const fmtMinAgo = (min: number, lang: Lang) => {
  if (min < 1) return lang === 'es' ? 'hace unos segundos' : 'a few seconds ago';
  if (min < 60) return lang === 'es' ? `hace ${min} min` : `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return lang === 'es' ? `hace ${h} h` : `${h} h ago`;
  const d = Math.round(h / 24);
  return lang === 'es' ? `hace ${d} d` : `${d} d ago`;
};

export const iso = (d: Date) => format(d, 'yyyy-MM-dd');
