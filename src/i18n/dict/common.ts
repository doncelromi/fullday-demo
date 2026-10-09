import type { Dict } from './index';

const d: Dict = {
  // Navegación
  'nav.propuesta': ['Propuesta', 'Proposal'],
  'nav.comercial': ['Comercial', 'Commercial'],
  'nav.panel': ['Panel', 'Dashboard'],
  'nav.miPanel': ['Mi panel', 'My dashboard'],
  'nav.propiedades': ['Propiedades', 'Properties'],
  'nav.misPropiedades': ['Mis propiedades', 'My properties'],
  'nav.reservas': ['Reservas', 'Bookings'],
  'nav.calendarios': ['Calendarios', 'Calendars'],
  'nav.calendario': ['Calendario', 'Calendar'],
  'nav.pagos': ['Pagos', 'Payments'],
  'nav.cobros': ['Cobros', 'Payouts'],
  'nav.metricas': ['Métricas', 'Metrics'],
  'nav.misMetricas': ['Mis métricas', 'My metrics'],
  'nav.notificaciones': ['Notificaciones', 'Notifications'],
  'nav.notifShort': ['Avisos', 'Alerts'],
  'nav.usuarios': ['Usuarios', 'Users'],
  'nav.explorar': ['Explorar', 'Explore'],
  'nav.misReservas': ['Mis reservas', 'My bookings'],
  'nav.perfil': ['Mi perfil', 'My profile'],
  'nav.more': ['Más', 'More'],
  'nav.menu': ['Menú', 'Menu'],

  // Topbar
  'top.tour': ['Tour', 'Tour'],
  'top.viewAs': ['Ver como', 'View as'],
  'top.changeView': ['Cambiar de rol', 'Switch role'],
  'top.cta': ['Quiero arrancar', 'Let’s get started'],
  'top.logout': ['Cerrar sesión', 'Log out'],
  'top.theme': ['Cambiar tema', 'Toggle theme'],
  'top.lang': ['Idioma', 'Language'],
  'top.notifs': ['Notificaciones', 'Notifications'],
  'top.seeAll': ['Ver todas', 'See all'],
  'top.roleSwitched': ['Ahora ves la plataforma como {role}', 'You are now viewing as {role}'],
  'top.demo': ['DEMO PREVIEW', 'DEMO PREVIEW'],

  // Kickers por rol
  'kicker.admin': ['ADMINISTRACIÓN FULL DAY', 'FULL DAY ADMINISTRATION'],
  'kicker.propietario': ['SUPERANFITRIONA · Mariela Ruiz', 'SUPERHOST · Mariela Ruiz'],
  'kicker.cliente': ['HUÉSPED · Sofía Benítez', 'GUEST · Sofía Benítez'],
  'role.admin.sub': ['Javier · ve todo el negocio', 'Javier · sees the whole business'],
  'role.propietario.sub': ['Mariela · 3 casas', 'Mariela · 3 homes'],
  'role.cliente.sub': ['Sofía · huésped de CABA', 'Sofía · guest from Buenos Aires'],

  // Saludos
  'greet.morning': ['Buen día', 'Good morning'],
  'greet.afternoon': ['Buenas tardes', 'Good afternoon'],
  'greet.evening': ['Buenas noches', 'Good evening'],

  // Preview banner
  'banner.preview': ['PREVIEW NAVEGABLE', 'NAVIGABLE PREVIEW'],
  'banner.mock': ['DATOS MOCK', 'MOCK DATA'],
  'banner.title': ['Qué hace este módulo cuando esté funcional', 'What this module does once it’s live'],
  'banner.hide': ['Ocultar', 'Hide'],
  'banner.show': ['Ver', 'Show'],

  // DevNotice
  'dev.inDev': ['función en desarrollo', 'feature in development'],
  'dev.now': ['Ahora se simula:', 'Simulated now:'],
  'dev.later': ['Al desarrollar:', 'When built:'],
  'dev.badge': ['En desarrollo', 'In development'],

  // CTA
  'cta.demo': ['DEMO PREVIEW', 'DEMO PREVIEW'],
  'cta.title': ['¿Te gustó lo que ves? Hablemos y arrancamos.', 'Like what you see? Let’s talk and get started.'],
  'cta.button': ['Hablemos por WhatsApp', 'Chat on WhatsApp'],
  'cta.powered': ['Powered by Insights', 'Powered by Insights'],

  // Preview "Ver en el demo"
  'preview.back': ['Volver a la propuesta', 'Back to the proposal'],
  'preview.viewing': ['Estás viendo:', 'You’re viewing:'],

  // Comunes
  'common.close': ['Cerrar', 'Close'],
  'common.cancel': ['Cancelar', 'Cancel'],
  'common.save': ['Guardar', 'Save'],
  'common.send': ['Enviar', 'Send'],
  'common.search': ['Buscar', 'Search'],
  'common.filters': ['Filtros', 'Filters'],
  'common.clear': ['Limpiar', 'Clear'],
  'common.apply': ['Aplicar', 'Apply'],
  'common.all': ['Todos', 'All'],
  'common.allF': ['Todas', 'All'],
  'common.seeDetail': ['Ver detalle', 'View details'],
  'common.actions': ['Acciones', 'Actions'],
  'common.empty': ['No hay resultados con estos filtros.', 'No results with these filters.'],
  'common.nights': ['{n} noches', '{n} nights'],
  'common.night': ['noche', 'night'],
  'common.perNight': ['/ noche', '/ night'],
  'common.guests': ['{n} huéspedes', '{n} guests'],
  'common.superhost': ['Superanfitrión', 'Superhost'],
  'common.superhostF': ['Superanfitriona', 'Superhost'],
  'common.copied': ['URL copiada al portapapeles', 'URL copied to clipboard'],
  'common.saved': ['Cambios guardados', 'Changes saved'],
  'common.more': ['Ver más', 'Show more'],
  'common.less': ['Ver menos', 'Show less'],
  'common.continue': ['Continuar', 'Continue'],
  'common.back': ['Atrás', 'Back'],
  'common.yes': ['Sí', 'Yes'],
  'common.total': ['Total', 'Total'],
  'common.reason': ['Motivo', 'Reason'],
  'common.detail': ['Detalle', 'Details'],
  'common.list': ['Lista', 'List'],
  'common.map': ['Mapa', 'Map'],

  // Agente IA (chrome)
  'ai.title': ['Conserje Full Day', 'Full Day Concierge'],
  'ai.online': ['en línea', 'online'],
  'ai.open': ['Abrir el Conserje Full Day', 'Open the Full Day Concierge'],
  'ai.placeholder': ['Escribí tu pregunta…', 'Type your question…'],
  'ai.footer': ['Versión demo — conectar API para respuestas en tiempo real', 'Demo version — connect the API for real-time answers'],
  'ai.goPropuesta': ['Ir a Propuesta', 'Go to Proposal'],
  'ai.goCal': ['Ir a Calendarios', 'Go to Calendars'],
  'ai.goPagos': ['Ir a Pagos', 'Go to Payments'],
  'ai.goExplorar': ['Ver casas', 'See homes'],
  'ai.goMetricas': ['Ver métricas', 'See metrics'],
  'ai.goCalOwner': ['Ver mi calendario', 'See my calendar'],
};
export default d;
