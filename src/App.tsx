import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/layout/AppShell';
import { useApp } from '@/store';
import { Trailer } from '@/features/trailer/Trailer';
import Login from '@/pages/Login';
import Propuesta from '@/pages/Propuesta';
import AdminPanel from '@/pages/admin/Panel';
import AdminPropiedades from '@/pages/admin/Propiedades';
import AdminReservas from '@/pages/admin/Reservas';
import AdminReservaDetalle from '@/pages/admin/ReservaDetalle';
import AdminCalendarios from '@/pages/admin/Calendarios';
import AdminPagos from '@/pages/admin/Pagos';
import AdminMetricas from '@/pages/admin/Metricas';
import AdminNotificaciones from '@/pages/admin/Notificaciones';
import AdminUsuarios from '@/pages/admin/Usuarios';
import OwnerPanel from '@/pages/propietario/Panel';
import OwnerPropiedades from '@/pages/propietario/Propiedades';
import OwnerReservas from '@/pages/propietario/Reservas';
import OwnerCalendario from '@/pages/propietario/Calendario';
import OwnerCobros from '@/pages/propietario/Cobros';
import OwnerMetricas from '@/pages/propietario/Metricas';
import OwnerNotificaciones from '@/pages/propietario/Notificaciones';
import MisReservas from '@/pages/cliente/MisReservas';
import ClienteNotificaciones from '@/pages/cliente/Notificaciones';
import Perfil from '@/pages/cliente/Perfil';
import Reservar from '@/pages/cliente/Reservar';

// Leaflet solo carga en las vistas con mapa
const Explorar = lazy(() => import('@/pages/cliente/Explorar'));
const Propiedad = lazy(() => import('@/pages/cliente/Propiedad'));

const Fallback = () => <div className="h-[60dvh]" />;

export default function App() {
  const authed = useApp((s) => s.authed);
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          <Route path="/propuesta" element={<Propuesta />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/propiedades" element={<AdminPropiedades />} />
          <Route path="/admin/reservas" element={<AdminReservas />} />
          <Route path="/admin/reservas/:id" element={<AdminReservaDetalle />} />
          <Route path="/admin/calendarios" element={<AdminCalendarios />} />
          <Route path="/admin/pagos" element={<AdminPagos />} />
          <Route path="/admin/metricas" element={<AdminMetricas />} />
          <Route path="/admin/notificaciones" element={<AdminNotificaciones />} />
          <Route path="/admin/usuarios" element={<AdminUsuarios />} />
          <Route path="/propietario" element={<OwnerPanel />} />
          <Route path="/propietario/propiedades" element={<OwnerPropiedades />} />
          <Route path="/propietario/reservas" element={<OwnerReservas />} />
          <Route path="/propietario/calendario" element={<OwnerCalendario />} />
          <Route path="/propietario/cobros" element={<OwnerCobros />} />
          <Route path="/propietario/metricas" element={<OwnerMetricas />} />
          <Route path="/propietario/notificaciones" element={<OwnerNotificaciones />} />
          <Route
            path="/explorar"
            element={
              <Suspense fallback={<Fallback />}>
                <Explorar />
              </Suspense>
            }
          />
          <Route
            path="/propiedad/:slug"
            element={
              <Suspense fallback={<Fallback />}>
                <Propiedad />
              </Suspense>
            }
          />
          <Route path="/reservar/:slug" element={<Reservar />} />
          <Route path="/mis-reservas" element={<MisReservas />} />
          <Route path="/notificaciones" element={<ClienteNotificaciones />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>
        <Route path="*" element={<Navigate to={authed ? '/propuesta' : '/login'} replace />} />
      </Routes>
      <Trailer />
    </>
  );
}
