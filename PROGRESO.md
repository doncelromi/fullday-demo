# PROGRESO — Full Day (demo)

## Completado
- B1 Scaffold: Vite 5 + React 18 + TS + Tailwind 3 (todo en `dependencies`), tokens light/dark oliva, fuentes Inter/JetBrains Mono, anti-flash, render.yaml con rewrite SPA, manifest + íconos 192/512.
- B2 i18n (`useT` → `t` claves compartidas, `x(es,en)` copy por vista, `e` enums; `tr` puro para efectos) + store zustand (sesión, rol, tema, idioma, preview, datos).
- B3 Datos mock determinísticos relativos a HOY (14 propiedades, 8 propietarios, 25 huéspedes, ~360 reservas en 6 meses, pagos MP, webhooks, logs iCal, notificaciones) + selectores (KPIs calculados).
- B4 Shell: top-nav desktop con "Propuesta" primera + micro-label COMERCIAL + "Más ▾" medido en vivo, topbar mobile, bottom-nav + sheet "Más", role switcher segmentado, campanita, footer CTA, guardas por rol.
- B5 Login dos columnas + auto-fill por rol → siempre /propuesta.
- B6 Welcome Modal (1 vez por sesión, no cierra con backdrop).
- B16 Propuesta (circuito, 7 módulos, inversión oculta con ojito, imprimir, "Ver en el demo" con retorno y resaltado).

## En curso
- Vistas por rol.

## Pendiente
- Cliente, Propietario, Admin, Tour, Trailer, Agente IA, QA responsive, repo GitHub.

## Decisiones
- Volumen de reservas mayor al sugerido (~360 vs ~90) para que la ocupación y la facturación sean creíbles para 14 casas (ocupación ~47% del mes, +15% vs. mes anterior). Todos los KPIs se calculan desde el store.
- Las fechas del mock se generan relativas al día en que se abre la demo, así "próximos 7 días", FD-1043 (check-in en 3 días) y MP-88213 (expira en 6 h) siempre son verdad.
- Reservas Full Day con código FD-xxxx; Airbnb (HMxxxxxx) y Booking (BK-…) conservan el formato de su canal.

## Bloqueos
- Ninguno.
