export type Lang = 'es' | 'en';
export type Bi = [string, string];
export type Role = 'admin' | 'propietario' | 'cliente';

export type Servicio = 'pileta' | 'parrilla' | 'wifi' | 'cochera' | 'aire' | 'pet' | 'cordillera' | 'bodega' | 'jacuzzi' | 'chimenea';

export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  role: Role;
  ciudad?: string;
  pais?: string;
  documento?: string;
  estado: 'activo' | 'suspendido' | 'invitado';
  ultimoAccesoMin: number; // minutos atrás
}

export interface Propietario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  superanfitrionDesde: number;
  propiedades: string[];
}

export type FeedState = 'ok' | 'error' | 'syncing';
export interface FeedStatus {
  url: string;
  estado: FeedState;
  ultimaSyncMin: number;
  error?: Bi;
}

export type TipoAnuncio = 'alojamiento' | 'experiencia';

export interface Propiedad {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoAnuncio;
  /** Destacado manual desde el panel admin → aparece primero en el catálogo */
  destacado: boolean;
  /** Reputación importada de Airbnb (regla automática de Superanfitrión) */
  airbnbRating: number;
  airbnbResenas: number;
  /** auto = cumple la regla de reputación de Airbnb · manual = lo marcó el admin */
  superSource: 'auto' | 'manual' | 'none';
  /** Solo experiencias */
  duracion?: Bi;
  horario?: string;
  categoria?: Bi;
  propietarioId: string;
  descripcion: Bi;
  zona: string;
  capacidad: number;
  dormitorios: number;
  banos: number;
  precioNoche: number;
  estadiaMinima: number;
  servicios: Servicio[];
  fotos: string[];
  lat: number;
  lng: number;
  rating: number;
  resenas: number;
  feeds: { airbnb?: FeedStatus; booking?: FeedStatus };
  activa: boolean;
  superanfitrion: boolean;
  nueva?: boolean;
}

export type Origen = 'fullday' | 'airbnb' | 'booking' | 'bloqueo';
export type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada' | 'finalizada';
export type Identidad = 'validada' | 'revision' | 'rechazada' | 'n/a';

export interface EventoEstado {
  fecha: string; // ISO
  texto: Bi;
  actor: string;
}

export interface Acompanante {
  nombre: string;
  dni: string;
}

export interface Reserva {
  id: string;
  propiedadId: string;
  huespedId?: string;
  huespedNombre: string;
  origen: Origen;
  checkIn: string; // yyyy-MM-dd
  checkOut: string;
  huespedes: number;
  acompanantes: Acompanante[];
  monto: number;
  estado: EstadoReserva;
  identidad: Identidad;
  pagoId?: string;
  creada: string; // ISO
  historial: EventoEstado[];
  motivoCancelacion?: string;
  nueva?: boolean;
}

export type MedioPago = 'tarjeta' | 'debito' | 'dinero_cuenta' | 'efectivo';
export type EstadoPago = 'aprobado' | 'pendiente' | 'rechazado' | 'expirado';

export interface Pago {
  id: string;
  reservaId: string;
  monto: number;
  medio: MedioPago;
  estado: EstadoPago;
  fecha: string; // ISO
  expiraHoras?: number;
}

export type Plantilla = 'recibida' | 'confirmada' | 'cancelada' | 'pago' | 'recordatorio' | 'sync';
export type EstadoEntrega = 'enviado' | 'entregado' | 'leido' | 'fallido';

export interface Notificacion {
  id: string;
  rol: Role;
  destinatarioId: string;
  destinatario: string;
  plantilla: Plantilla;
  canal: 'whatsapp' | 'app';
  estado: EstadoEntrega;
  leida: boolean;
  fecha: string; // ISO
  texto: Bi;
  reservaId?: string;
}

export interface WebhookLog {
  id: string;
  fecha: string;
  evento: string;
  pagoId: string;
  estado: EstadoPago;
  reservaId: string;
  resultado: Bi;
  http: number;
}

export interface Resena {
  id: string;
  propiedadId: string;
  autor: string;
  ciudad: string;
  rating: number; // 1-5
  texto: Bi;
  fecha: string; // ISO
  reservaId?: string;
  verificada: boolean;
}

export type Timing = 'inmediato' | '24h' | '48h' | '72h';
export interface PlantillaConfig {
  id: Plantilla;
  activa: boolean;
  destinatario: 'huesped' | 'propietario' | 'ambos';
  timing: Timing;
  texto: Bi;
  editada?: string; // ISO de la última edición
}

export interface SyncLog {
  id: string;
  fecha: string;
  propiedadId: string;
  canal: 'airbnb' | 'booking';
  nivel: 'ok' | 'error' | 'info';
  texto: Bi;
  reintentos?: number;
  resuelto?: boolean;
}
