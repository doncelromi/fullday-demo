import type { Propietario, Role, User } from '@/types';

export const ADMIN: User = {
  id: 'u-javier',
  nombre: 'Javier Full',
  email: 'admin@fullday.ar',
  telefono: '+54 9 261 555-0100',
  role: 'admin',
  ciudad: 'Chacras de Coria',
  pais: 'AR',
  estado: 'activo',
  ultimoAccesoMin: 0,
};

export const PROPIETARIOS: Propietario[] = [
  { id: 'o-mariela', nombre: 'Mariela Ruiz', email: 'mariela@fullday.ar', telefono: '+54 9 261 555-0111', superanfitrionDesde: 2017, propiedades: ['p-olivar', 'p-alamos', 'p-viamonte'] },
  { id: 'o-gustavo', nombre: 'Gustavo Aliaga', email: 'gustavo.aliaga@fullday.ar', telefono: '+54 9 261 555-0112', superanfitrionDesde: 2018, propiedades: ['p-tipas', 'p-aljibe'] },
  { id: 'o-florencia', nombre: 'Florencia Lucero', email: 'florencia.lucero@fullday.ar', telefono: '+54 9 261 555-0113', superanfitrionDesde: 2019, propiedades: ['p-italia', 'p-lavanda'] },
  { id: 'o-martin', nombre: 'Martín Videla', email: 'martin.videla@fullday.ar', telefono: '+54 9 261 555-0114', superanfitrionDesde: 2020, propiedades: ['p-cerroarco'] },
  { id: 'o-carolina', nombre: 'Carolina Funes', email: 'carolina.funes@fullday.ar', telefono: '+54 9 261 555-0115', superanfitrionDesde: 2018, propiedades: ['p-glorieta', 'p-estudio'] },
  { id: 'o-diego', nombre: 'Diego Ponce', email: 'diego.ponce@fullday.ar', telefono: '+54 9 261 555-0116', superanfitrionDesde: 2021, propiedades: ['p-malbec'] },
  { id: 'o-lucia', nombre: 'Lucía Guiñazú', email: 'lucia.guinazu@fullday.ar', telefono: '+54 9 261 555-0117', superanfitrionDesde: 2019, propiedades: ['p-nogales', 'p-membrillos'] },
  { id: 'o-esteban', nombre: 'Esteban Correas', email: 'esteban.correas@fullday.ar', telefono: '+54 9 261 555-0118', superanfitrionDesde: 2022, propiedades: ['p-torreon'] },
];

export const propietarioById = (id: string) => PROPIETARIOS.find((p) => p.id === id)!;

const G = (id: string, nombre: string, ciudad: string, pais: string, documento: string, min: number): User => ({
  id,
  nombre,
  email:
    nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ /g, '.') + (pais === 'AR' ? '@gmail.com' : pais === 'CL' ? '@gmail.cl' : pais === 'BR' ? '@gmail.com.br' : '@web.de'),
  telefono: pais === 'AR' ? '+54 9 11 5' + id.slice(-3) + '-' + (4000 + min) : pais === 'CL' ? '+56 9 8' + (3000000 + min) : pais === 'BR' ? '+55 11 9' + (6000000 + min) : '+49 151 ' + (2000000 + min),
  role: 'cliente',
  ciudad,
  pais,
  documento,
  estado: 'activo',
  ultimoAccesoMin: min,
});

export const HUESPEDES: User[] = [
  { ...G('g-001', 'Sofía Benítez', 'CABA', 'AR', 'DNI 38.214.557', 35), email: 'sofia.benitez@gmail.com', telefono: '+54 9 11 5832-4417' },
  G('g-002', 'Tomás Pereyra', 'Córdoba', 'AR', 'DNI 35.902.118', 180),
  G('g-003', 'Agustina Molina', 'Rosario', 'AR', 'DNI 40.117.302', 300),
  G('g-004', 'Ignacio Fernández', 'CABA', 'AR', 'DNI 33.448.910', 1440),
  G('g-005', 'Camila Rojas', 'Santiago de Chile', 'CL', 'RUT 18.442.613-5', 2880),
  G('g-006', 'João Almeida', 'São Paulo', 'BR', 'Pass. FX482193', 720),
  G('g-007', 'Hannah Weber', 'Múnich', 'DE', 'Pass. C4KL82M91', 4320),
  G('g-008', 'Martina Gómez', 'CABA', 'AR', 'DNI 39.552.074', 95),
  G('g-009', 'Federico Sosa', 'Córdoba', 'AR', 'DNI 31.208.665', 2100),
  G('g-010', 'Valentina Ruiz Díaz', 'La Plata', 'AR', 'DNI 41.093.228', 600),
  G('g-011', 'Matías Herrera', 'Rosario', 'AR', 'DNI 34.771.019', 8600),
  G('g-012', 'Lucas Domínguez', 'CABA', 'AR', 'DNI 36.315.402', 410),
  G('g-013', 'Florencia Acosta', 'Neuquén', 'AR', 'DNI 37.660.981', 1900),
  G('g-014', 'Benjamín Castro', 'Santiago de Chile', 'CL', 'RUT 17.903.554-2', 3300),
  G('g-015', 'Julieta Morales', 'CABA', 'AR', 'DNI 42.118.736', 250),
  G('g-016', 'Pedro Carvalho', 'Río de Janeiro', 'BR', 'Pass. GA190377', 5100),
  G('g-017', 'Carolina Paz', 'Tucumán', 'AR', 'DNI 32.884.150', 7200),
  G('g-018', 'Nicolás Giménez', 'Mar del Plata', 'AR', 'DNI 35.019.447', 960),
  G('g-019', 'Emma Fischer', 'Berlín', 'DE', 'Pass. C7PT01X44', 10080),
  G('g-020', 'Santiago Ortiz', 'Córdoba', 'AR', 'DNI 38.907.663', 1320),
  G('g-021', 'Paula Medina', 'CABA', 'AR', 'DNI 36.552.891', 520),
  G('g-022', 'Diego Navarro', 'Santa Fe', 'AR', 'DNI 30.774.205', 4500),
  G('g-023', 'Isidora Muñoz', 'Valparaíso', 'CL', 'RUT 19.220.871-K', 2600),
  G('g-024', 'Gonzalo Romero', 'Bahía Blanca', 'AR', 'DNI 34.009.512', 15000),
  G('g-025', 'Lara Bianchi', 'CABA', 'AR', 'DNI 40.661.395', 75),
];

export const huespedById = (id?: string) => HUESPEDES.find((h) => h.id === id);

export const SOFIA = HUESPEDES[0];

/** Persona que representa a cada rol en la demo */
export const ROLE_PERSON: Record<Role, { id: string; nombre: string; email: string; initials: string }> = {
  admin: { id: ADMIN.id, nombre: 'Javier Full', email: ADMIN.email, initials: 'JF' },
  propietario: { id: 'o-mariela', nombre: 'Mariela Ruiz', email: 'mariela@fullday.ar', initials: 'MR' },
  cliente: { id: 'g-001', nombre: 'Sofía Benítez', email: 'sofia.benitez@gmail.com', initials: 'SB' },
};

export const DEMO_ACCOUNTS: { role: Role; email: string }[] = [
  { role: 'admin', email: 'admin@fullday.ar' },
  { role: 'propietario', email: 'mariela@fullday.ar' },
  { role: 'cliente', email: 'sofia.benitez@gmail.com' },
];
export const DEMO_PASS = 'demo2026';

/** Usuarios del sistema (para /admin/usuarios) */
export const ALL_USERS: User[] = [
  ADMIN,
  {
    id: 'u-lucho',
    nombre: 'Luciano (Lucho)',
    email: 'lucho@fullday.ar',
    telefono: '+54 9 261 555-0101',
    role: 'admin',
    estado: 'activo',
    ultimoAccesoMin: 42,
  },
  ...PROPIETARIOS.map<User>((p, i) => ({
    id: p.id,
    nombre: p.nombre,
    email: p.email,
    telefono: p.telefono,
    role: 'propietario',
    estado: i === 7 ? 'invitado' : 'activo',
    ultimoAccesoMin: [12, 240, 600, 1500, 90, 3000, 420, 99999][i],
  })),
  ...HUESPEDES,
];
