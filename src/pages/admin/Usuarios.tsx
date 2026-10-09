import { useMemo, useState } from 'react';
import { Check, Minus, Pencil, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { ALL_USERS } from '@/data/users';
import { fmtMinAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, Badge, Empty, Modal, PageHeader, PreviewBanner, RowMenu, Segmented, SidePanel, type Tone } from '@/components/ui';
import type { Role, User } from '@/types';

type Estado = User['estado'];
const estadoTone: Record<Estado, Tone> = { activo: 'ok', suspendido: 'danger', invitado: 'warn' };

type Perm = 'yes' | 'no' | 'own';
const MODULES: { key: string; es: string; en: string; perms: Record<Role, Perm> }[] = [
  { key: 'propuesta', es: 'Propuesta', en: 'Proposal', perms: { admin: 'yes', propietario: 'yes', cliente: 'yes' } },
  { key: 'panel', es: 'Panel', en: 'Dashboard', perms: { admin: 'yes', propietario: 'own', cliente: 'no' } },
  { key: 'propiedades', es: 'Propiedades', en: 'Properties', perms: { admin: 'yes', propietario: 'own', cliente: 'no' } },
  { key: 'reservas', es: 'Reservas', en: 'Bookings', perms: { admin: 'yes', propietario: 'own', cliente: 'own' } },
  { key: 'calendarios', es: 'Calendarios', en: 'Calendars', perms: { admin: 'yes', propietario: 'own', cliente: 'no' } },
  { key: 'pagos', es: 'Pagos', en: 'Payments', perms: { admin: 'yes', propietario: 'own', cliente: 'own' } },
  { key: 'metricas', es: 'Métricas', en: 'Metrics', perms: { admin: 'yes', propietario: 'own', cliente: 'no' } },
  { key: 'notificaciones', es: 'Notificaciones', en: 'Notifications', perms: { admin: 'yes', propietario: 'own', cliente: 'own' } },
  { key: 'usuarios', es: 'Usuarios', en: 'Users', perms: { admin: 'yes', propietario: 'no', cliente: 'no' } },
  { key: 'explorar', es: 'Explorar / Reservar', en: 'Explore / Book', perms: { admin: 'yes', propietario: 'yes', cliente: 'yes' } },
];
const ROLES: Role[] = ['admin', 'propietario', 'cliente'];

export default function AdminUsuarios() {
  const { x, e, lang } = useT();
  const toast = useApp((s) => s.toast);

  const [users, setUsers] = useState<User[]>(ALL_USERS);
  const [q, setQ] = useState('');
  const [rol, setRol] = useState<'todos' | Role>('todos');
  const [limit, setLimit] = useState(20);
  const [edit, setEdit] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<Role>('cliente');
  const [editEstado, setEditEstado] = useState<Estado>('activo');
  const [invite, setInvite] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<Role>('propietario');
  const [invTouched, setInvTouched] = useState(false);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return users.filter((u) => (rol === 'todos' || u.role === rol) && (!n || (u.nombre + ' ' + u.email).toLowerCase().includes(n)));
  }, [users, q, rol]);

  const count = (r: Role) => users.filter((u) => u.role === r).length;

  const openEdit = (u: User) => {
    setEdit(u);
    setEditRole(u.role);
    setEditEstado(u.estado);
  };

  const saveEdit = () => {
    if (!edit) return;
    setUsers((list) => list.map((u) => (u.id === edit.id ? { ...u, role: editRole, estado: editEstado } : u)));
    toast(x('{n}: rol {r} · {s}', '{n}: role {r} · {s}', { n: edit.nombre, r: e('role', editRole), s: e('userEstado', editEstado) }));
    setEdit(null);
  };

  const setEstado = (u: User, s: Estado) => {
    setUsers((list) => list.map((v) => (v.id === u.id ? { ...v, estado: s } : v)));
    toast(s === 'suspendido' ? x('{n} suspendido · ya no puede ingresar', '{n} suspended · can no longer sign in', { n: u.nombre }) : x('{n} reactivado', '{n} reactivated', { n: u.nombre }), s === 'suspendido' ? 'warn' : 'ok');
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(invEmail.trim());
  const sendInvite = () => {
    setInvTouched(true);
    if (!emailOk) return;
    const email = invEmail.trim().toLowerCase();
    if (users.some((u) => u.email === email)) {
      toast(x('Ya existe un usuario con ese email', 'A user with that email already exists'), 'warn');
      return;
    }
    const nombre = email
      .split('@')[0]
      .split(/[._-]/)
      .filter(Boolean)
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .join(' ');
    setUsers((list) => [{ id: `inv-${Date.now()}`, nombre, email, telefono: '', role: invRole, estado: 'invitado', ultimoAccesoMin: 99999 }, ...list]);
    toast(x('Invitación enviada a {m} como {r}', 'Invite sent to {m} as {r}', { m: email, r: e('role', invRole) }));
    setInvite(false);
    setInvEmail('');
    setInvTouched(false);
    setRol('todos');
    setQ('');
  };

  const lastAccess = (u: User) => (u.estado === 'invitado' || u.ultimoAccesoMin >= 99999 ? x('Nunca ingresó', 'Never signed in') : u.ultimoAccesoMin < 5 ? x('En línea', 'Online') : fmtMinAgo(u.ultimoAccesoMin, lang));

  const menu = (u: User) => [
    { label: x('Editar rol', 'Edit role'), icon: <Pencil size={15} />, onClick: () => openEdit(u) },
    ...(u.estado === 'invitado' ? [{ label: x('Reenviar invitación', 'Resend invite'), onClick: () => toast(x('Invitación reenviada a {m}', 'Invite resent to {m}', { m: u.email }), 'info') }] : []),
    u.estado === 'suspendido'
      ? { label: x('Reactivar', 'Reactivate'), onClick: () => setEstado(u, 'activo') }
      : { label: x('Suspender', 'Suspend'), onClick: () => setEstado(u, 'suspendido'), danger: true },
  ];

  const permCell = (p: Perm) =>
    p === 'yes' ? (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ok/10 text-ok" aria-label="✓">
        <Check size={14} strokeWidth={3} />
      </span>
    ) : p === 'own' ? (
      <span className="pill bg-gold/15 text-gold">{x('solo propias', 'own only')}</span>
    ) : (
      <span className="inline-flex h-7 w-7 items-center justify-center text-muted" aria-label="—">
        <Minus size={14} />
      </span>
    );

  return (
    <div className="fade-up">
      <PageHeader
        title={x('Usuarios', 'Users')}
        subtitle={x('Administradores, propietarios y huéspedes con acceso a Full Day.', 'Admins, owners and guests with access to Full Day.')}
        actions={
          <button className="btn-primary" onClick={() => setInvite(true)}>
            <UserPlus size={16} />
            {x('Invitar usuario', 'Invite user')}
          </button>
        }
      />
      <PreviewBanner
        bullets={[
          x('Cada persona entra con su cuenta y ve solo lo que le corresponde a su rol.', 'Everyone signs in with their own account and only sees what their role allows.'),
          x('Invitás propietarios por email; ellos completan sus datos y conectan sus casas.', 'Invite owners by email; they complete their profile and connect their homes.'),
          x('Podés cambiar roles o suspender accesos al instante.', 'Change roles or suspend access instantly.'),
        ]}
      />

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={rol}
          onChange={(v) => {
            setRol(v);
            setLimit(20);
          }}
          options={[
            { value: 'todos', label: x('Todos', 'All'), count: users.length },
            { value: 'admin', label: e('role', 'admin'), count: count('admin') },
            { value: 'propietario', label: x('Propietarios', 'Owners'), count: count('propietario') },
            { value: 'cliente', label: x('Huéspedes', 'Guests'), count: count('cliente') },
          ]}
        />
        <div className="relative lg:w-80">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder={x('Buscar por nombre o email', 'Search by name or email')} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty text={x('No hay usuarios que coincidan.', 'No matching users.')} />
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    <th className="th">{x('Usuario', 'User')}</th>
                    <th className="th hidden lg:table-cell">Email</th>
                    <th className="th">{x('Rol', 'Role')}</th>
                    <th className="th">{x('Estado', 'Status')}</th>
                    <th className="th hidden lg:table-cell">{x('Último acceso', 'Last access')}</th>
                    <th className="th w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.slice(0, limit).map((u) => (
                    <tr key={u.id} className={cn('transition hover:bg-subtle/60', u.estado === 'suspendido' && 'opacity-60')}>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.nombre} role={u.role} size={32} />
                          <div className="min-w-0">
                            <div className="max-w-[220px] truncate font-medium">{u.nombre}</div>
                            <div className="max-w-[220px] truncate text-xs text-muted lg:hidden">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td hidden text-[13px] text-ink2 lg:table-cell">{u.email}</td>
                      <td className="td">
                        <RoleBadge r={u.role} />
                      </td>
                      <td className="td">
                        <Badge tone={estadoTone[u.estado]} dot>
                          {e('userEstado', u.estado)}
                        </Badge>
                      </td>
                      <td className="td hidden whitespace-nowrap text-[13px] text-ink2 lg:table-cell">{lastAccess(u)}</td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn-ghost btn-sm hidden xl:inline-flex" onClick={() => openEdit(u)}>
                            <Pencil size={13} />
                            {x('Editar rol', 'Edit role')}
                          </button>
                          <RowMenu items={menu(u)} label={x('Acciones', 'Actions')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {filtered.slice(0, limit).map((u) => (
              <div key={u.id} className={cn('card flex items-start gap-3 p-3.5', u.estado === 'suspendido' && 'opacity-70')}>
                <Avatar name={u.nombre} role={u.role} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{u.nombre}</div>
                  <div className="truncate text-xs text-ink2">{u.email}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <RoleBadge r={u.role} />
                    <Badge tone={estadoTone[u.estado]} dot>
                      {e('userEstado', u.estado)}
                    </Badge>
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted">
                    {x('Último acceso:', 'Last access:')} {lastAccess(u)}
                  </div>
                </div>
                <div className="-mr-2 -mt-1.5">
                  <RowMenu items={menu(u)} label={x('Acciones', 'Actions')} />
                </div>
              </div>
            ))}
          </div>

          {filtered.length > limit && (
            <div className="mt-3 flex justify-center">
              <button className="btn-secondary btn-sm" onClick={() => setLimit((l) => l + 20)}>
                {x('Ver más ({n} restantes)', 'Show more ({n} left)', { n: filtered.length - limit })}
              </button>
            </div>
          )}
        </>
      )}

      {/* ---------- RBAC ---------- */}
      <section className="card mt-6 min-w-0" data-tour="rbac">
        <div className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-soft text-navy">
            <ShieldCheck size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="section-title">{x('Permisos por rol (RBAC)', 'Role permissions (RBAC)')}</div>
            <div className="text-xs text-ink2">{x('Cada pedido al servidor valida el rol: no alcanza con ocultar botones en la pantalla.', 'Every server request validates the role: hiding buttons on screen is not enough.')}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px]">
            <thead className="border-b border-line bg-subtle">
              <tr>
                <th className="th sticky left-0 bg-subtle">{x('Módulo', 'Module')}</th>
                {ROLES.map((r) => (
                  <th key={r} className="th text-center">
                    {r === 'cliente' ? x('Huésped', 'Guest') : e('role', r)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MODULES.map((m) => (
                <tr key={m.key}>
                  <td className="td sticky left-0 bg-card font-medium">{lang === 'es' ? m.es : m.en}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="td text-center">
                      {permCell(m.perms[r])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-3 text-[11.5px] text-ink2 sm:px-5">
          <span className="flex items-center gap-1.5">
            <Check size={12} className="text-ok" strokeWidth={3} /> {x('acceso completo', 'full access')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="pill bg-gold/15 py-0 text-gold">{x('solo propias', 'own only')}</span> {x('solo sus casas, reservas o datos', 'only their homes, bookings or data')}
          </span>
          <span className="flex items-center gap-1.5">
            <Minus size={12} className="text-muted" /> {x('sin acceso', 'no access')}
          </span>
        </div>
      </section>

      {/* ---------- Editar rol ---------- */}
      <SidePanel
        open={!!edit}
        onClose={() => setEdit(null)}
        title={x('Editar rol', 'Edit role')}
        footer={
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setEdit(null)}>
              {x('Cancelar', 'Cancel')}
            </button>
            <button className="btn-primary flex-1" onClick={saveEdit}>
              {x('Guardar', 'Save')}
            </button>
          </div>
        }
      >
        {edit && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={edit.nombre} role={editRole} size={44} />
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{edit.nombre}</div>
                <div className="truncate text-xs text-ink2">{edit.email}</div>
              </div>
            </div>
            <div>
              <span className="label">{x('Rol', 'Role')}</span>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditRole(r)}
                    className={cn('flex w-full items-start gap-3 rounded-ctl border p-3 text-left transition', editRole === r ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong')}
                  >
                    <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2', editRole === r ? 'border-accent' : 'border-line-strong')}>{editRole === r && <span className="h-2 w-2 rounded-full bg-accent" />}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{e('role', r)}</span>
                      <span className="block text-xs text-ink2">
                        {r === 'admin'
                          ? x('Ve y gestiona todo el negocio.', 'Sees and manages the whole business.')
                          : r === 'propietario'
                            ? x('Ve solo sus casas, reservas, cobros y métricas.', 'Sees only their homes, bookings, payouts and metrics.')
                            : x('Explora, reserva y ve sus propias reservas.', 'Explores, books and sees their own bookings.')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="u-estado">
                {x('Estado', 'Status')}
              </label>
              <select id="u-estado" className="input" value={editEstado} onChange={(ev) => setEditEstado(ev.target.value as Estado)}>
                {(['activo', 'invitado', 'suspendido'] as Estado[]).map((s) => (
                  <option key={s} value={s}>
                    {e('userEstado', s)}
                  </option>
                ))}
              </select>
            </div>
            {edit.role !== editRole && (
              <p className="rounded-ctl border border-warn/30 bg-warn/[0.07] px-3 py-2 text-[12.5px] text-ink2">
                {x('Al guardar, la sesión de {n} se renueva con los permisos de {r}.', 'On save, {n}’s session is renewed with {r} permissions.', { n: edit.nombre, r: e('role', editRole) })}
              </p>
            )}
          </div>
        )}
      </SidePanel>

      {/* ---------- Invitar ---------- */}
      <Modal
        open={invite}
        onClose={() => setInvite(false)}
        title={x('Invitar usuario', 'Invite user')}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setInvite(false)}>
              {x('Cancelar', 'Cancel')}
            </button>
            <button className="btn-primary" onClick={sendInvite}>
              <UserPlus size={15} />
              {x('Enviar invitación', 'Send invite')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="inv-email">
              Email
            </label>
            <input
              id="inv-email"
              type="email"
              autoFocus
              className={cn('input', invTouched && !emailOk && 'border-danger')}
              value={invEmail}
              onChange={(ev) => setInvEmail(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && sendInvite()}
              placeholder="nombre@ejemplo.com"
            />
            {invTouched && !emailOk && <p className="mt-1 text-xs text-danger">{x('Ingresá un email válido.', 'Enter a valid email.')}</p>}
          </div>
          <div>
            <span className="label">{x('Rol', 'Role')}</span>
            <Segmented
              full
              value={invRole}
              onChange={setInvRole}
              options={ROLES.map((r) => ({ value: r, label: e('role', r) }))}
            />
          </div>
          <p className="text-[12.5px] text-ink2">{x('Le llega un email con un link para crear su contraseña. El link vence en 72 h.', 'They get an email with a link to set their password. The link expires in 72 h.')}</p>
        </div>
      </Modal>
    </div>
  );
}

function RoleBadge({ r }: { r: Role }) {
  const { e } = useT();
  return <Badge tone={r === 'admin' ? 'accent' : r === 'propietario' ? 'gold' : 'neutral'}>{e('role', r)}</Badge>;
}
