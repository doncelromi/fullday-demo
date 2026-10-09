import type { Propiedad, Servicio } from '@/types';

const U = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

// Banco de fotos (casas de campo, viñedos, piletas, galerías, interiores)
const F = {
  houseModern: '1600596542815-ffad4c1539a9',
  houseExt: '1600585154340-be6161a56a0c',
  housePool: '1564013799919-ab600027ffc6',
  villaPool: '1613490493576-7fde63acd811',
  vineyard: '1506377247377-2a5b3b417ebb',
  wine: '1510812431401-41d2bd2722f3',
  resortPool: '1571896349842-33c89424de2d',
  resort: '1582268611958-ebfd161ef9cf',
  poolDeck: '1520250497591-112f2f40a3f4',
  houseA: '1568605114967-8130f3a36994',
  houseB: '1570129477492-45c003edd2be',
  houseC: '1576941089067-2de3c901e126',
  luxury: '1512917774080-9991f1c4c750',
  living: '1502672260266-1c1ef2d93688',
  apt: '1522708323590-d24dbb6b0267',
  bedroom: '1505693416388-ac5ce068fe85',
  kitchen: '1556909114-f6e7ad7d3136',
  aptB: '1560448204-e02f11c3d0e2',
  cabin: '1449844908441-8829872d2607',
  cabinB: '1542718610-a1d656d1884c',
  houseD: '1464146072230-91cabc968266',
  houseE: '1523217582562-09d0def993a6',
  mountains: '1506905925346-21bda4d32df4',
  mountainsB: '1464822759023-fed622ff2c3b',
  interiorA: '1600607687939-ce8a6c25118c',
  interiorB: '1600566753190-17f0baa2a6c3',
  interiorC: '1600210492486-724fe5c67fb0',
  villaB: '1613977257363-707ba9348227',
  bedroomB: '1615874959474-d609969a20ed',
  livingB: '1586023492125-27b2c045efd7',
  houseF: '1540518614846-7eded433c457',
  houseG: '1499793983690-e29da59ef1c2',
  forestHouse: '1416331108676-a22ccb276e35',
  houseH: '1572120360610-d971b9d7767c',
  houseI: '1580587771525-78b9dba3b914',
  bedroomC: '1505691938895-1758d7feb511',
  kitchenB: '1484154218962-a197022b5858',
  livingC: '1493809842364-78817add7ffb',
  hotel: '1551882547-ff40c63fe5fa',
  hotelB: '1566073771259-6a8506099945',
};

/** Regla automática: reputación en Airbnb ≥ 4,8 con al menos 20 reseñas → Superanfitrión */
export const SUPER_RULE = { rating: 4.8, resenas: 20 };

const fotos = (...ids: (keyof typeof F)[]) => ids.map((k) => U(F[k]));

const feed = (slug: string, canal: 'airbnb' | 'booking', min: number) => ({
  url:
    canal === 'airbnb'
      ? `https://www.airbnb.com.ar/calendar/ical/${(slug.length * 7919 + 40213117).toString()}.ics?s=${slug.slice(0, 6)}f3a9`
      : `https://admin.booking.com/hotel/hoteladmin/ical.html?t=${slug.slice(0, 5)}-${(slug.length * 104729).toString(16)}`,
  estado: 'ok' as const,
  ultimaSyncMin: min,
});

const P = (
  id: string,
  slug: string,
  nombre: string,
  propietarioId: string,
  zona: string,
  [capacidad, dormitorios, banos]: [number, number, number],
  precioNoche: number,
  estadiaMinima: number,
  servicios: Servicio[],
  ph: string[],
  [lat, lng]: [number, number],
  [rating, resenas]: [number, number],
  canales: ('airbnb' | 'booking')[],
  descripcion: [string, string],
): Propiedad => ({
  id,
  slug,
  nombre,
  tipo: 'alojamiento',
  destacado: ['p-olivar', 'p-tipas', 'p-italia', 'p-malbec'].includes(id),
  airbnbRating: rating,
  airbnbResenas: resenas,
  superSource: rating >= SUPER_RULE.rating && resenas >= SUPER_RULE.resenas ? 'auto' : 'manual',
  propietarioId,
  zona,
  capacidad,
  dormitorios,
  banos,
  precioNoche,
  estadiaMinima,
  servicios,
  fotos: ph,
  lat,
  lng,
  rating,
  resenas,
  feeds: {
    airbnb: canales.includes('airbnb') ? feed(slug, 'airbnb', 3) : undefined,
    booking: canales.includes('booking') ? feed(slug, 'booking', 4) : undefined,
  },
  activa: true,
  superanfitrion: true,
  descripcion,
});

export const PROPIEDADES: Propiedad[] = [
  P('p-olivar', 'casa-del-olivar', 'Casa del Olivar', 'o-mariela', 'Calle Larrea', [6, 3, 2], 185000, 2, ['pileta', 'parrilla', 'wifi', 'cochera', 'aire', 'cordillera'], fotos('housePool', 'livingB', 'bedroom', 'kitchen', 'vineyard'), [-32.9862, -68.8771], [4.97, 184], ['airbnb', 'booking'], [
    'Casa de campo entre olivos centenarios, a dos cuadras de la plaza de Chacras. Galería con vista a la cordillera, pileta climatizada y parrilla para asados largos.',
    'Country house among century-old olive trees, two blocks from Chacras square. Porch facing the Andes, heated pool and a grill for long asados.',
  ]),
  P('p-tipas', 'finca-las-tipas', 'Finca Las Tipas', 'o-gustavo', 'Viamonte y Darragueira', [10, 5, 4], 320000, 3, ['pileta', 'parrilla', 'wifi', 'cochera', 'aire', 'bodega', 'cordillera', 'pet'], fotos('villaPool', 'interiorA', 'bedroomB', 'wine', 'mountains'), [-32.9901, -68.8812], [4.95, 126], ['airbnb', 'booking'], [
    'Finca de 2 hectáreas con viñedo propio, cava y quincho. Ideal para grupos y familias grandes que buscan privacidad total.',
    '5-acre estate with its own vineyard, wine cellar and party house. Ideal for groups and large families seeking full privacy.',
  ]),
  P('p-viamonte', 'loft-viamonte', 'Loft Viamonte', 'o-mariela', 'Viamonte 5200', [2, 1, 1], 110000, 2, ['wifi', 'aire', 'cochera'], fotos('apt', 'aptB', 'bedroomC', 'kitchenB'), [-32.9879, -68.8745], [4.98, 211], ['airbnb'], [
    'Loft de diseño para dos sobre la calle Viamonte, a pasos de bodegas boutique, cafés y restaurantes.',
    'Design loft for two on Viamonte street, steps away from boutique wineries, cafés and restaurants.',
  ]),
  P('p-alamos', 'cabana-los-alamos', 'Cabaña Los Álamos', 'o-mariela', 'Callejón Los Álamos', [4, 2, 1], 140000, 2, ['parrilla', 'wifi', 'chimenea', 'pet', 'cordillera'], fotos('cabin', 'livingC', 'bedroom', 'mountainsB'), [-32.9925, -68.8735], [4.96, 98], ['airbnb', 'booking'], [
    'Cabaña de madera entre álamos, con hogar a leña y deck mirando al cerro. Pet friendly.',
    'Wooden cabin among poplars, with a wood-burning fireplace and a deck facing the hills. Pet friendly.',
  ]),
  P('p-italia', 'casona-italia', 'Casona Italia', 'o-florencia', 'Italia 6100', [8, 4, 3], 260000, 3, ['pileta', 'parrilla', 'wifi', 'cochera', 'aire', 'jacuzzi'], fotos('luxury', 'interiorB', 'bedroomB', 'poolDeck'), [-32.9845, -68.8798], [4.94, 143], ['airbnb', 'booking'], [
    'Casona de 1920 restaurada, con techos altos, jardín de rosas y pileta con solárium.',
    'Restored 1920s manor with high ceilings, a rose garden and a pool with sun deck.',
  ]),
  P('p-cerroarco', 'refugio-cerro-arco', 'Refugio Cerro Arco', 'o-martin', 'Pedemonte', [4, 2, 2], 165000, 2, ['wifi', 'chimenea', 'cordillera', 'jacuzzi'], fotos('forestHouse', 'livingB', 'bedroomC', 'mountains'), [-32.9958, -68.8885], [4.93, 76], ['airbnb'], [
    'Refugio de montaña con jacuzzi exterior y vista abierta a la cordillera. Silencio absoluto.',
    'Mountain retreat with an outdoor hot tub and open views of the Andes. Absolute silence.',
  ]),
  P('p-glorieta', 'la-glorieta-de-chacras', 'La Glorieta de Chacras', 'o-carolina', 'Plaza de Chacras', [6, 3, 2], 175000, 2, ['pileta', 'parrilla', 'wifi', 'aire'], fotos('houseC', 'interiorC', 'bedroom', 'resortPool'), [-32.9868, -68.8732], [4.92, 109], ['airbnb', 'booking'], [
    'Casa con glorieta y jardín frente a la plaza: caminás a la feria, a los cafés y a las vinotecas.',
    'House with a gazebo and garden facing the square: walk to the market, cafés and wine shops.',
  ]),
  P('p-malbec', 'casa-malbec', 'Casa Malbec', 'o-diego', 'Ruta 82', [6, 3, 3], 210000, 3, ['pileta', 'parrilla', 'wifi', 'cochera', 'bodega', 'cordillera'], fotos('houseModern', 'livingC', 'bedroomB', 'vineyard'), [-32.9935, -68.8792], [4.96, 88], ['airbnb', 'booking'], [
    'Casa moderna entre viñedos de Malbec, con cava propia y degustación de bienvenida.',
    'Modern house among Malbec vineyards, with its own cellar and a welcome tasting.',
  ]),
  P('p-nogales', 'quinta-los-nogales', 'Quinta Los Nogales', 'o-lucia', 'Callejón Maure', [8, 4, 3], 230000, 3, ['pileta', 'parrilla', 'wifi', 'cochera', 'pet'], fotos('houseD', 'interiorA', 'bedroomC', 'poolDeck'), [-32.9822, -68.8829], [4.91, 67], ['booking'], [
    'Quinta con parque de nogales, pileta grande y quincho para 20 personas.',
    'Country estate with a walnut grove, large pool and an outdoor dining hall for 20.',
  ]),
  P('p-estudio', 'estudio-plaza-chacras', 'Estudio Plaza Chacras', 'o-carolina', 'Plaza de Chacras', [2, 1, 1], 95000, 2, ['wifi', 'aire'], fotos('aptB', 'apt', 'kitchenB'), [-32.9873, -68.8727], [4.9, 152], ['airbnb'], [
    'Estudio luminoso frente a la plaza, perfecto para una escapada de fin de semana.',
    'Bright studio facing the square, perfect for a weekend getaway.',
  ]),
  P('p-lavanda', 'casa-lavanda', 'Casa Lavanda', 'o-florencia', 'Larrea 1400', [4, 2, 2], 150000, 2, ['pileta', 'parrilla', 'wifi', 'aire', 'pet'], fotos('houseB', 'livingB', 'bedroom', 'housePool'), [-32.9894, -68.8758], [4.95, 81], ['airbnb', 'booking'], [
    'Casa rodeada de lavandas, con pileta y galería. Ideal parejas o familia chica.',
    'House surrounded by lavender, with pool and porch. Ideal for couples or small families.',
  ]),
  P('p-aljibe', 'finca-el-aljibe', 'Finca El Aljibe', 'o-gustavo', 'Callejón Aguirre', [8, 4, 3], 245000, 3, ['pileta', 'parrilla', 'wifi', 'cochera', 'bodega', 'cordillera'], fotos('villaB', 'interiorB', 'bedroomB', 'wine'), [-32.9947, -68.8848], [4.93, 58], ['airbnb', 'booking'], [
    'Finca con aljibe original, olivar y pileta entre viñas. Desayuno regional incluido.',
    'Estate with an original well, olive grove and a pool among vines. Regional breakfast included.',
  ]),
  P('p-membrillos', 'posada-los-membrillos', 'Posada Los Membrillos', 'o-lucia', 'Pueyrredón', [5, 2, 2], 135000, 2, ['pileta', 'wifi', 'parrilla', 'aire'], fotos('houseE', 'livingC', 'bedroomC', 'resort'), [-32.9811, -68.8761], [4.92, 64], ['booking'], [
    'Posada familiar entre membrillos y frutales, con pileta y desayuno casero.',
    'Family guesthouse among quince and fruit trees, with pool and homemade breakfast.',
  ]),
  P('p-torreon', 'casita-del-torreon', 'Casita del Torreón', 'o-esteban', 'Barrio El Torreón', [3, 1, 1], 105000, 2, ['wifi', 'parrilla', 'pet'], fotos('houseF', 'apt', 'bedroom'), [-32.9973, -68.8761], [4.76, 19], ['airbnb'], [
    'Casita con torreón y patio, tranquila y sencilla, a 10 minutos del centro de Chacras.',
    'Small house with a turret and patio, quiet and simple, 10 minutes from downtown Chacras.',
  ]),
];

// Edge case visible: Finca Las Tipas con error de sincronización con Booking hace 2 h
PROPIEDADES[1].feeds.booking = {
  ...PROPIEDADES[1].feeds.booking!,
  estado: 'error',
  ultimaSyncMin: 124,
  error: ['Tiempo de espera agotado · 3 reintentos', 'Request timed out · 3 retries'],
};

/* ---------- Experiencias en la zona (Chacras · Luján de Cuyo · Vistalba) ---------- */
const X = (
  id: string,
  slug: string,
  nombre: string,
  propietarioId: string,
  zona: string,
  categoria: [string, string],
  capacidad: number,
  precio: number,
  duracion: [string, string],
  horario: string,
  ph: string[],
  [lat, lng]: [number, number],
  [rating, resenas]: [number, number],
  destacado: boolean,
  descripcion: [string, string],
): Propiedad => ({
  id,
  slug,
  nombre,
  tipo: 'experiencia',
  destacado,
  airbnbRating: rating,
  airbnbResenas: resenas,
  superSource: rating >= SUPER_RULE.rating && resenas >= SUPER_RULE.resenas ? 'auto' : 'manual',
  categoria,
  duracion,
  horario,
  propietarioId,
  zona,
  capacidad,
  dormitorios: 0,
  banos: 0,
  precioNoche: precio,
  estadiaMinima: 1,
  servicios: [],
  fotos: ph,
  lat,
  lng,
  rating,
  resenas,
  feeds: { airbnb: feed(slug, 'airbnb', 6) },
  activa: true,
  superanfitrion: true,
  descripcion,
});

const UX = (id: string) => U(id);

export const EXPERIENCIAS: Propiedad[] = [
  X('x-degustacion', 'degustacion-bodega-las-tipas', 'Degustación en Finca Las Tipas', 'o-gustavo', 'Chacras de Coria', ['Vinos', 'Wine'], 10, 45000, ['2 h', '2 h'], '11:00 · 17:00', [UX('1528823872057-9c018a7a7553'), U(F.wine), U(F.vineyard)], [-32.9907, -68.8822], [4.98, 142], true, [
    'Recorrido por el viñedo y la cava con el enólogo, y degustación de 5 vinos de la finca con quesos de la zona.',
    'Tour of the vineyard and cellar with the winemaker, and a tasting of 5 estate wines paired with local cheeses.',
  ]),
  X('x-cabalgata', 'cabalgata-cerro-arco', 'Cabalgata al atardecer en Cerro Arco', 'o-martin', 'Pedemonte · Luján de Cuyo', ['Aventura', 'Adventure'], 8, 68000, ['3 h', '3 h'], '17:30', [UX('1553284965-83fd3e82fa5a'), U(F.mountains), U(F.mountainsB)], [-32.9975, -68.8925], [4.95, 88], true, [
    'Cabalgata guiada por la precordillera con mate y tortas fritas viendo el atardecer sobre Mendoza.',
    'Guided horseback ride through the Andean foothills with mate and fried pastries at sunset over Mendoza.',
  ]),
  X('x-bici', 'bici-por-bodegas', 'Bici por bodegas de Luján', 'o-carolina', 'Chacras → Vistalba', ['Vinos', 'Wine'], 12, 38000, ['4 h', '4 h'], '10:00', [UX('1485965120184-e220f721d03e'), U(F.vineyard), U(F.wine)], [-32.9861, -68.8735], [4.91, 63], false, [
    'Pedaleo suave por callejones arbolados con paradas en 3 bodegas boutique. Incluye bici, casco y almuerzo liviano.',
    'Easy ride along tree-lined lanes with stops at 3 boutique wineries. Bike, helmet and light lunch included.',
  ]),
  X('x-cocina', 'clase-de-asado-y-cocina-cuyana', 'Clase de asado y cocina cuyana', 'o-lucia', 'Quinta Los Nogales', ['Gastronomía', 'Food'], 10, 52000, ['3 h', '3 h'], '12:30', [UX('1555939594-58d7cb561ad1'), UX('1504674900247-0877df9cc836'), UX('1516594798947-e65505dbb29d')], [-32.9825, -68.8834], [4.97, 51], false, [
    'Aprendé a hacer un asado mendocino, empanadas al horno de barro y una ensalada de la huerta. Se come lo que se cocina.',
    'Learn to make a Mendoza-style asado, clay-oven empanadas and a garden salad. You eat what you cook.',
  ]),
  X('x-picnic', 'picnic-entre-vinas', 'Picnic entre viñas', 'o-diego', 'Casa Malbec · Ruta 82', ['Vinos', 'Wine'], 6, 41000, ['2 h 30', '2.5 h'], '12:00 · 18:00', [UX('1526662092594-e98c1e356d6a'), U(F.vineyard), UX('1474722883778-792e7990302f')], [-32.9938, -68.8799], [4.93, 37], false, [
    'Canasta con fiambres, panes caseros y una botella de Malbec para disfrutar a la sombra de los olivos.',
    'Basket with cold cuts, homemade breads and a bottle of Malbec to enjoy in the shade of the olive trees.',
  ]),
  X('x-yoga', 'yoga-y-brunch-en-la-galeria', 'Yoga y brunch en la galería', 'o-florencia', 'Casona Italia', ['Bienestar', 'Wellness'], 12, 32000, ['2 h', '2 h'], '09:30', [UX('1544367567-0f2fcb009e0b'), U(F.interiorB), UX('1567696911980-2eed69a46042')], [-32.9847, -68.8801], [4.89, 14], false, [
    'Clase de yoga al aire libre mirando la cordillera y brunch con productos de la huerta.',
    'Outdoor yoga class facing the Andes followed by brunch with produce from the garden.',
  ]),
];

/** Todos los anuncios (alojamientos + experiencias) */
export const ANUNCIOS: Propiedad[] = [...PROPIEDADES, ...EXPERIENCIAS];

export const propById = (id: string) => ANUNCIOS.find((p) => p.id === id)!;
export const propBySlug = (slug: string) => ANUNCIOS.find((p) => p.slug === slug);

/** Orden "relevancia": destacados primero, después Superanfitriones por reputación */
export const relevance = (a: Propiedad, b: Propiedad) =>
  Number(b.destacado) - Number(a.destacado) || Number(b.superanfitrion) - Number(a.superanfitrion) || b.rating * Math.log(b.resenas + 1) - a.rating * Math.log(a.resenas + 1);

export const SERVICIOS: Servicio[] = ['pileta', 'parrilla', 'wifi', 'cochera', 'aire', 'pet', 'cordillera', 'bodega', 'jacuzzi', 'chimenea'];

export const CHACRAS_CENTER: [number, number] = [-32.988, -68.876];

export const photoFallback = 'linear-gradient(135deg, #273469 0%, #4a5a9c 50%, #e2601a 100%)';

export const fullDayFeedUrl = (slug: string) => `https://fullday.ar/ical/${slug}.ics?token=fd_${slug.length.toString(16)}9c2e`;
