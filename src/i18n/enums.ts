import type { Bi } from '@/types';

/** Mapas {valor interno → [es, en]}. El valor interno nunca cambia. */
export const ENUMS = {
  role: {
    admin: ['Admin', 'Admin'],
    propietario: ['Propietario', 'Owner'],
    cliente: ['Cliente', 'Guest'],
  },
  estado: {
    pendiente: ['Pendiente', 'Pending'],
    confirmada: ['Confirmada', 'Confirmed'],
    cancelada: ['Cancelada', 'Cancelled'],
    finalizada: ['Finalizada', 'Completed'],
  },
  origen: {
    fullday: ['Full Day', 'Full Day'],
    airbnb: ['Airbnb', 'Airbnb'],
    booking: ['Booking', 'Booking'],
    bloqueo: ['Bloqueo manual', 'Manual block'],
  },
  identidad: {
    validada: ['Validada', 'Verified'],
    revision: ['En revisión', 'Under review'],
    rechazada: ['Rechazada', 'Rejected'],
    'n/a': ['No aplica', 'N/A'],
  },
  pago: {
    aprobado: ['Aprobado', 'Approved'],
    pendiente: ['Pendiente', 'Pending'],
    rechazado: ['Rechazado', 'Rejected'],
    expirado: ['Expirado', 'Expired'],
  },
  medio: {
    tarjeta: ['Tarjeta de crédito', 'Credit card'],
    debito: ['Tarjeta de débito', 'Debit card'],
    dinero_cuenta: ['Dinero en cuenta MP', 'MP account balance'],
    efectivo: ['Efectivo (Pago Fácil)', 'Cash (Pago Fácil)'],
  },
  plantilla: {
    recibida: ['Reserva recibida', 'Booking received'],
    confirmada: ['Reserva confirmada', 'Booking confirmed'],
    cancelada: ['Reserva cancelada', 'Booking cancelled'],
    pago: ['Pago acreditado', 'Payment credited'],
    recordatorio: ['Recordatorio de check-in', 'Check-in reminder'],
    sync: ['Alerta de sincronización', 'Sync alert'],
  },
  entrega: {
    enviado: ['Enviado', 'Sent'],
    entregado: ['Entregado', 'Delivered'],
    leido: ['Leído', 'Read'],
    fallido: ['Fallido', 'Failed'],
  },
  canal: {
    whatsapp: ['WhatsApp', 'WhatsApp'],
    app: ['App', 'In-app'],
  },
  servicio: {
    pileta: ['Pileta', 'Pool'],
    parrilla: ['Parrilla', 'BBQ grill'],
    wifi: ['Wi-Fi', 'Wi-Fi'],
    cochera: ['Cochera', 'Parking'],
    aire: ['Aire acondicionado', 'Air conditioning'],
    pet: ['Pet friendly', 'Pet friendly'],
    cordillera: ['Vista a la cordillera', 'Andes view'],
    bodega: ['Cava de vinos', 'Wine cellar'],
    jacuzzi: ['Jacuzzi', 'Hot tub'],
    chimenea: ['Hogar a leña', 'Fireplace'],
  },
  userEstado: {
    activo: ['Activo', 'Active'],
    suspendido: ['Suspendido', 'Suspended'],
    invitado: ['Invitación enviada', 'Invite sent'],
  },
} satisfies Record<string, Record<string, Bi>>;

export type EnumName = keyof typeof ENUMS;
