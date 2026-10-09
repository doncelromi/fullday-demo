import type { Bi } from '@/types';

export type Dict = Record<string, Bi>;

// Cada área exporta su diccionario. Se fusionan acá.
const modules = import.meta.glob<{ default: Dict }>('./*.ts', { eager: true });

export const DICT: Dict = Object.entries(modules).reduce<Dict>((acc, [path, mod]) => {
  if (path.endsWith('index.ts')) return acc;
  return { ...acc, ...mod.default };
}, {});
