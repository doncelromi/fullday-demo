import type { Lang, Role } from '@/types';
import { tr } from '@/i18n';
import { BOTTOM, NAV } from '@/config/nav';

export interface TourStep {
  id: string;
  target?: string; // valor de data-tour
  fallback?: string; // si el target no es visible (ej. ítem dentro de "Más ▾")
  route?: string;
  title: string;
  body: string;
}

export interface TourData {
  rev: string;
  top: string;
  topN: number;
}

/** Pasos en ORDEN VISUAL EXACTO del menú del rol. */
export function getTourSteps(role: Role, lang: Lang, esMobile: boolean, data: TourData): TourStep[] {
  const L = (k: string, v?: Record<string, string | number>) => tr(k, lang, v);
  const steps: TourStep[] = [];

  // (1) Welcome centrado por rol
  steps.push({ id: `welcome-${role}`, title: L(`tour.w.${role}.t`), body: L(`tour.w.${role}.b`) });

  // (2) Overview de la navegación
  steps.push(esMobile ? { id: 'nav', target: 'bottom-nav', title: L('tour.navm.t'), body: L('tour.navm.b') } : { id: 'nav', target: 'top-nav', title: L('tour.nav.t'), body: L('tour.nav.b') });

  // (3) Un paso por ítem del menú, de izquierda a derecha
  NAV[role].forEach((it, i) => {
    const inBottom = BOTTOM[role].includes(it.id);
    const target = esMobile ? (inBottom ? `tab-${it.id}` : 'mobile-menu') : `nav-${it.id}`;
    const key = it.id === 'propuesta' ? 'tour.i.propuesta' : `tour.i.${role}.${it.id}`;
    const body = L(key, { rev: data.rev, top: data.top, n: data.topN }) + (esMobile && !inBottom ? ' ' + L('tour.more', { item: L(it.label) }) : '');
    steps.push({
      id: `item-${it.id}`,
      target,
      fallback: esMobile ? undefined : 'nav-more',
      route: it.path,
      title: `${i + 1}. ${L(it.label)}`,
      body,
    });
  });

  // (4) Role switcher
  steps.push(esMobile ? { id: 'switch', target: 'mobile-menu', title: L('tour.switch.t'), body: L('tour.switchm.b') } : { id: 'switch', target: 'switch-user', title: L('tour.switch.t'), body: L('tour.switch.b') });

  // (5) CTA comercial
  steps.push(esMobile ? { id: 'cta', target: 'mobile-menu', title: L('tour.cta.t'), body: L('tour.ctam.b') } : { id: 'cta', target: 'whatsapp-cta', title: L('tour.cta.t'), body: L('tour.cta.b') });

  return steps;
}
