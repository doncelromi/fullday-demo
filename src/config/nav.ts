import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarRange,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  Search,
  Ticket,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  id: string;
  path: string;
  label: string; // clave i18n
  short?: string; // etiqueta corta para la bottom-nav
  icon: LucideIcon;
}

const propuesta: NavItem = { id: 'propuesta', path: '/propuesta', label: 'nav.propuesta', icon: FileText };

export const NAV: Record<Role, NavItem[]> = {
  admin: [
    propuesta,
    { id: 'panel', path: '/admin', label: 'nav.panel', icon: LayoutDashboard },
    { id: 'propiedades', path: '/admin/propiedades', label: 'nav.propiedades', icon: Home },
    { id: 'reservas', path: '/admin/reservas', label: 'nav.reservas', icon: Ticket },
    { id: 'calendarios', path: '/admin/calendarios', label: 'nav.calendarios', icon: CalendarRange },
    { id: 'pagos', path: '/admin/pagos', label: 'nav.pagos', icon: CreditCard },
    { id: 'metricas', path: '/admin/metricas', label: 'nav.metricas', icon: BarChart3 },
    { id: 'notificaciones', path: '/admin/notificaciones', label: 'nav.notificaciones', short: 'nav.notifShort', icon: Bell },
    { id: 'usuarios', path: '/admin/usuarios', label: 'nav.usuarios', icon: Users },
  ],
  propietario: [
    propuesta,
    { id: 'panel', path: '/propietario', label: 'nav.miPanel', icon: LayoutDashboard },
    { id: 'propiedades', path: '/propietario/propiedades', label: 'nav.misPropiedades', short: 'nav.propiedades', icon: Home },
    { id: 'reservas', path: '/propietario/reservas', label: 'nav.reservas', icon: Ticket },
    { id: 'calendario', path: '/propietario/calendario', label: 'nav.calendario', icon: CalendarDays },
    { id: 'cobros', path: '/propietario/cobros', label: 'nav.cobros', icon: Wallet },
    { id: 'metricas', path: '/propietario/metricas', label: 'nav.misMetricas', short: 'nav.metricas', icon: BarChart3 },
    { id: 'notificaciones', path: '/propietario/notificaciones', label: 'nav.notificaciones', short: 'nav.notifShort', icon: Bell },
  ],
  cliente: [
    propuesta,
    { id: 'explorar', path: '/explorar', label: 'nav.explorar', icon: Search },
    { id: 'misreservas', path: '/mis-reservas', label: 'nav.misReservas', icon: Ticket },
    { id: 'notificaciones', path: '/notificaciones', label: 'nav.notificaciones', short: 'nav.notifShort', icon: Bell },
    { id: 'perfil', path: '/perfil', label: 'nav.perfil', icon: UserCircle },
  ],
};

/** Ítems de la bottom-nav mobile (4 + "Más") */
export const BOTTOM: Record<Role, string[]> = {
  admin: ['propuesta', 'panel', 'reservas', 'metricas'],
  propietario: ['propuesta', 'panel', 'calendario', 'cobros'],
  cliente: ['propuesta', 'explorar', 'misreservas', 'notificaciones'],
};

export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin',
  propietario: '/propietario',
  cliente: '/explorar',
};

/** Rutas permitidas por rol (guardas) */
export const allowedFor = (role: Role, path: string) => {
  if (path === '/propuesta') return true;
  if (role === 'admin') return path === '/admin' || path.startsWith('/admin/');
  if (role === 'propietario') return path === '/propietario' || path.startsWith('/propietario/');
  return ['/explorar', '/mis-reservas', '/notificaciones', '/perfil'].includes(path) || path.startsWith('/propiedad/') || path.startsWith('/reservar/');
};

export const ROLES: Role[] = ['admin', 'propietario', 'cliente'];

export const ROLE_COLOR: Record<Role, string> = {
  admin: 'var(--accent)',
  propietario: 'var(--gold)',
  cliente: 'var(--accent)',
};
