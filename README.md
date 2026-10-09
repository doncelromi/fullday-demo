# Full Day Go! — demo navegable

MVP de previsualización (datos mock) de la plataforma de reservas premium de Superanfitriones en Chacras de Coria, Mendoza. Construido por Insights para la reunión con Javier y Lucho.

## Credenciales de demo
| Rol | Usuario | Contraseña |
|---|---|---|
| Admin (Javier) | admin@fullday.ar | demo2026 |
| Propietario (Mariela Ruiz) | mariela@fullday.ar | demo2026 |
| Cliente (Sofía Benítez) | sofia.benitez@gmail.com | demo2026 |

En el login, las pills por rol completan los datos sin enviar. Cualquier rol entra a **/propuesta** (propuesta comercial). Desde ahí, "Ver en el demo ↗" abre cada módulo en el rol correcto con botón de retorno.

## Correr local
```bash
npm install
npm run dev
```
Build de producción: `npm run build` → `dist/`. Verificación de traducciones: `npm run check:i18n`.

## Deploy (Render, static site, plan gratis)
`render.yaml` ya define el sitio estático con el rewrite SPA (`/* → /index.html`), necesario para que recargar o abrir un link interno no devuelva "Not Found".

## Qué incluye
- 3 roles con switcher en vivo, top-nav desktop / bottom-nav + sheet "Más" en mobile.
- Catálogo de alojamientos y experiencias, destacados primero, badge de Superanfitrión automático por reputación de Airbnb (con override manual del admin).
- Reserva en 5 pasos con bloqueo temporal de 15 min, identidad, pago Mercado Pago simulado y propagación a calendarios, reservas y notificaciones.
- Reseñas con estrellas de huéspedes con estadía verificada.
- Calendario unificado Full Day + Airbnb + Booking, sincronización iCal simulada con log.
- Pagos MP con log de webhooks y "Simular webhook".
- Métricas (facturación total/por casa, top 5, origen, CSV real).
- Plantillas de WhatsApp editables con vista previa.
- Tour guiado manual, Modo Trailer (≥1024px), Conserje IA pre-programado, ES/EN, claro/oscuro.
