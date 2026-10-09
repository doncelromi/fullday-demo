import { subDays } from 'date-fns';
import type { Bi, PlantillaConfig, Resena } from '@/types';
import { rng } from '@/lib/utils';
import { ANUNCIOS } from './properties';
import { HUESPEDES } from './users';

/* ---------- Reseñas de huéspedes verificados ---------- */
const TEXTOS: Bi[] = [
  ['Todo impecable. La galería mirando la cordillera al atardecer vale el viaje.', 'Spotless. The porch facing the Andes at sunset is worth the trip.'],
  ['El check-in fue facilísimo y la anfitriona súper atenta por WhatsApp.', 'Check-in was super easy and the host very responsive on WhatsApp.'],
  ['Volveríamos sin dudarlo. Ideal para recorrer bodegas de Luján.', 'We’d come back in a heartbeat. Perfect base for Luján wineries.'],
  ['La casa es igual a las fotos, o mejor. Muy silenciosa y limpia.', 'The house looks just like the photos, or better. Very quiet and clean.'],
  ['Excelente ubicación, a dos cuadras de la plaza de Chacras.', 'Great location, two blocks from Chacras square.'],
  ['Nos dejaron un vino de bienvenida y recomendaciones buenísimas.', 'They left us a welcome wine and great recommendations.'],
  ['Muy lindo todo, solo el wifi un poco lento en la galería.', 'All lovely, just the wifi was a bit slow on the porch.'],
  ['Una experiencia de diez, el guía sabía muchísimo.', 'A perfect experience, the guide knew so much.'],
];

const r = rng(77);
const resenas: Resena[] = [];
let id = 1;
for (const p of ANUNCIOS) {
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const g = HUESPEDES[1 + Math.floor(r() * (HUESPEDES.length - 1))];
    const rating = r() < 0.82 ? 5 : 4;
    const tx = TEXTOS[(p.tipo === 'experiencia' && i === 0 ? 7 : Math.floor(r() * 7)) % TEXTOS.length];
    resenas.push({ id: `rv-${id++}`, propiedadId: p.id, autor: g.nombre, ciudad: g.ciudad ?? '', rating: tx === TEXTOS[6] ? 4 : rating, texto: tx, fecha: subDays(new Date(), 5 + Math.floor(r() * 150)).toISOString(), verificada: true });
  }
}
// La reseña que dejó Sofía de su estadía en Casona Italia
resenas.push({
  id: 'rv-sofia-1',
  propiedadId: 'p-italia',
  autor: 'Sofía Benítez',
  ciudad: 'CABA',
  rating: 5,
  texto: ['Fuimos con amigas y fue perfecto: la pileta, el jardín y Florencia un sol.', 'We went with friends and it was perfect: the pool, the garden and Florencia was lovely.'],
  fecha: subDays(new Date(), 112).toISOString(),
  verificada: true,
});
resenas.sort((a, b) => b.fecha.localeCompare(a.fecha));
export const RESENAS = resenas;

/* ---------- Plantillas de WhatsApp (editables desde el panel admin) ---------- */
export const PLANTILLA_VARS = ['{{huesped}}', '{{propiedad}}', '{{fecha}}', '{{codigo}}', '{{monto}}', '{{anfitrion}}', '{{direccion}}'];

export const DEFAULT_PLANTILLAS: PlantillaConfig[] = [
  {
    id: 'recibida',
    activa: true,
    destinatario: 'ambos',
    timing: 'inmediato',
    texto: [
      'Hola {{huesped}} 👋 Recibimos tu reserva {{codigo}} en {{propiedad}} para el {{fecha}}. Te avisamos apenas se acredite el pago.',
      'Hi {{huesped}} 👋 We received your booking {{codigo}} at {{propiedad}} for {{fecha}}. We’ll let you know as soon as the payment clears.',
    ],
  },
  {
    id: 'confirmada',
    activa: true,
    destinatario: 'ambos',
    timing: 'inmediato',
    texto: [
      '¡Listo, {{huesped}}! Tu reserva {{codigo}} en {{propiedad}} está confirmada ✅ Check-in: {{fecha}}. Tu anfitrión es {{anfitrion}}.',
      'All set, {{huesped}}! Your booking {{codigo}} at {{propiedad}} is confirmed ✅ Check-in: {{fecha}}. Your host is {{anfitrion}}.',
    ],
  },
  {
    id: 'cancelada',
    activa: true,
    destinatario: 'ambos',
    timing: 'inmediato',
    texto: [
      'Hola {{huesped}}, tu reserva {{codigo}} en {{propiedad}} fue cancelada. Si fue un error, respondé este mensaje y te ayudamos.',
      'Hi {{huesped}}, your booking {{codigo}} at {{propiedad}} was cancelled. If this was a mistake, reply and we’ll help.',
    ],
  },
  {
    id: 'pago',
    activa: true,
    destinatario: 'huesped',
    timing: 'inmediato',
    texto: [
      'Recibimos tu pago de {{monto}} por la reserva {{codigo}} 💳 ¡Gracias!',
      'We received your payment of {{monto}} for booking {{codigo}} 💳 Thank you!',
    ],
  },
  {
    id: 'recordatorio',
    activa: true,
    destinatario: 'huesped',
    timing: '48h',
    texto: [
      'Hola {{huesped}} 🍇 Faltan 48 h para tu llegada a {{propiedad}} ({{fecha}}). Dirección: {{direccion}}. Cualquier cosa, escribile a {{anfitrion}}.',
      'Hi {{huesped}} 🍇 48 h until you arrive at {{propiedad}} ({{fecha}}). Address: {{direccion}}. Anything you need, message {{anfitrion}}.',
    ],
  },
];

export const SAMPLE_VARS = (lang: 'es' | 'en'): Record<string, string> => ({
  '{{huesped}}': 'Sofía',
  '{{propiedad}}': 'Casa del Olivar',
  '{{fecha}}': lang === 'es' ? 'vie 14 nov' : 'Fri, Nov 14',
  '{{codigo}}': 'FD-1061',
  '{{monto}}': lang === 'es' ? '$ 740.000' : 'ARS 740,000',
  '{{anfitrion}}': 'Mariela',
  '{{direccion}}': 'Calle Larrea 1250, Chacras de Coria',
});

export const fillTemplate = (text: string, vars: Record<string, string>) => text.replace(/\{\{\w+\}\}/g, (m) => vars[m] ?? m);
