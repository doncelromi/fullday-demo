# PROGRESO — Full Day (demo)

## Completado
- B1 Scaffold: Vite 5 + React 18 + TS + Tailwind 3 (todo en `dependencies`), tokens light/dark oliva, fuentes Inter/JetBrains Mono, anti-flash, render.yaml con rewrite SPA, manifest + íconos 192/512.
- B2 i18n (`useT` → `t` claves compartidas, `x(es,en)` copy por vista, `e` enums; `tr` puro para efectos) + store zustand (sesión, rol, tema, idioma, preview, datos).
- B3 Datos mock determinísticos relativos a HOY (14 propiedades, 8 propietarios, 25 huéspedes, ~360 reservas en 6 meses, pagos MP, webhooks, logs iCal, notificaciones) + selectores (KPIs calculados).
- B4 Shell: top-nav desktop con "Propuesta" primera + micro-label COMERCIAL + "Más ▾" medido en vivo, topbar mobile, bottom-nav + sheet "Más", role switcher segmentado, campanita, footer CTA, guardas por rol.
- B5 Login dos columnas + auto-fill por rol → siempre /propuesta.
- B6 Welcome Modal (1 vez por sesión, no cierra con backdrop).
- B16 Propuesta (circuito, 7 módulos, inversión oculta con ojito, imprimir, "Ver en el demo" con retorno y resaltado).

- B7-B9 Cliente: Explorar (alojamientos + experiencias, destacados primero, filtros, mapa Leaflet), ficha con disponibilidad sincronizada y reseñas, reserva WOW en 5 pasos (bloqueo 15 min, identidad, Mercado Pago simulado, confirmación con propagación), Mis reservas (cancelar con motivo, dejar reseña), Perfil.
- B10-B11 Propietario: panel, propiedades (edición, bloqueo de fechas), reservas, calendario unificado mes/agenda, cobros, métricas, notificaciones con chat WhatsApp.
- B12-B14 Admin: panel con 'Requiere atención', propiedades (destacado manual + Superanfitrión auto por reputación Airbnb con override), reservas y detalle con identidad/historial, calendarios iCal con log y reintento, pagos con log de webhooks y 'Simular webhook', métricas con top 5 y CSV real, plantillas WhatsApp editables con vista previa, usuarios RBAC.
- B15 Preview banners + DevNotice. B17 Tour manual. B18 Modo Trailer (11 escenas). B19 Conserje IA con offsets mobile.
- B20 i18n:  → 0 faltantes (claves + pares x(es,en) sin vacíos).
- B21 QA: 0 scroll horizontal a 360px en las 25 rutas de los 3 roles; flujo de reserva propaga a Admin y calendario de Mariela; sin errores de consola; modo oscuro OK.
- B22 Build limpio (tsc + vite). Repo: https://github.com/doncelromi/fullday-demo

## Pendiente
- Deploy manual en Render (static site, render.yaml incluido).

## Decisiones
- Volumen de reservas mayor al sugerido (~360 vs ~90) para que la ocupación y la facturación sean creíbles para 14 casas (ocupación ~47% del mes, +15% vs. mes anterior). Todos los KPIs se calculan desde el store.
- Las fechas del mock se generan relativas al día en que se abre la demo, así "próximos 7 días", FD-1043 (check-in en 3 días) y MP-88213 (expira en 6 h) siempre son verdad.
- Reservas Full Day con código FD-xxxx; Airbnb (HMxxxxxx) y Booking (BK-…) conservan el formato de su canal.

- Pedidos de Javier sumados: destacados con prioridad (manual desde admin), Superanfitrión automático (Airbnb ≥ 4,8 y ≥ 20 reseñas) con override, reseñas con estrellas, experiencias de la zona, plantillas WhatsApp editables, sincronización con Airbnb visible en ficha/reserva/calendario.
- Marca: logo Go! FullDay y paleta naranja #E2601A + azul marino #273469 (en lugar del oliva del brief).
- Calendarios/Pagos admin: tabla + log lado a lado desde 1280px (antes se apilan) para que no quede apretado.

## Bloqueos
- Ninguno.
