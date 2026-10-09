import { useCallback } from 'react';
import type { Bi, Lang } from '@/types';
import { useApp } from '@/store';
import { ENUMS, type EnumName } from './enums';
import { DICT } from './dict';

export type Vars = Record<string, string | number>;

const interp = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`)) : s;

/** Función pura para efectos y lógica fuera de render */
export function tr(key: string, lang: Lang, vars?: Vars): string {
  const entry = DICT[key];
  if (!entry) {
    if (import.meta.env.DEV) console.warn('[i18n] falta clave', key);
    return key;
  }
  return interp(entry[lang === 'es' ? 0 : 1], vars);
}

export const bi = (v: Bi, lang: Lang, vars?: Vars) => interp(v[lang === 'es' ? 0 : 1], vars);

export function en<E extends EnumName>(name: E, value: string, lang: Lang): string {
  const m = ENUMS[name] as Record<string, Bi>;
  return m[value] ? m[value][lang === 'es' ? 0 : 1] : value;
}

/**
 * Hook para componentes. NO poner `t` en dependencias de useEffect: usar tr(key, lang).
 * - t(clave): textos compartidos del diccionario (nav, login, propuesta, tour…)
 * - x(es, en): copy propio de cada vista, siempre con las dos traducciones
 * - e(enum, valor): estados con valor interno estable
 */
export function useT() {
  const lang = useApp((s) => s.lang);
  const t = useCallback((key: string, vars?: Vars) => tr(key, lang, vars), [lang]);
  const b = useCallback((v: Bi, vars?: Vars) => bi(v, lang, vars), [lang]);
  const x = useCallback((es: string, enText: string, vars?: Vars) => interp(lang === 'es' ? es : enText, vars), [lang]);
  const e = useCallback(<E extends EnumName>(name: E, value: string) => en(name, value, lang), [lang]);
  return { t, b, x, e, lang };
}
