import { useMemo, useState } from 'react';
import { BadgeCheck, Bell, CreditCard, Save, Star } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { fmtDate } from '@/lib/format';
import { propById } from '@/data/properties';
import { SOFIA } from '@/data/users';
import { Avatar, Badge, Card, PageHeader, PreviewBanner, Switch } from '@/components/ui';
import { DniSample, Stars } from './_parts';

export default function Perfil() {
  const { x, b, lang } = useT();
  const reservas = useApp((s) => s.reservas);
  const resenas = useApp((s) => s.resenas);
  const [form, setForm] = useState({ nombre: SOFIA.nombre, email: SOFIA.email, tel: SOFIA.telefono, ciudad: 'CABA, Buenos Aires', doc: '38.214.557' });
  const [prefs, setPrefs] = useState({ wa: true, app: true, promo: false, recordatorio: true });
  const stays = useMemo(() => reservas.filter((r) => r.huespedId === 'g-001' && r.estado === 'finalizada').length, [reservas]);
  const mine = resenas.filter((r) => r.autor === 'Sofía Benítez');

  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });

  return (
    <div>
      <PageHeader title={x('Mi perfil', 'My profile')} subtitle={x('Tus datos, tu documento validado y cómo querés que te avisemos.', 'Your details, your verified ID and how you want to be notified.')} />
      <PreviewBanner
        bullets={[
          x('El documento se valida una vez y sirve para todas tus reservas.', 'Your ID is verified once and works for every booking.'),
          x('Elegís si te avisamos por WhatsApp, en la app o por las dos.', 'Choose whether we notify you on WhatsApp, in-app or both.'),
          x('Tus reseñas suman a la reputación de cada Superanfitrión.', 'Your reviews add to each Superhost’s reputation.'),
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={form.nombre} role="cliente" size={64} />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-ink">{form.nombre}</div>
                <div className="text-sm text-ink2">{form.ciudad}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="ok">
                    <BadgeCheck size={12} /> {x('Identidad validada', 'Identity verified')}
                  </Badge>
                  <Badge tone="neutral">{x('{n} estadías', '{n} stays', { n: stays })}</Badge>
                  <Badge tone="accent">{x('Huésped desde 2025', 'Guest since 2025')}</Badge>
                </div>
              </div>
            </div>
          </Card>
          <Card title={x('Datos personales', 'Personal details')}>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['nombre', x('Nombre y apellido', 'Full name')],
                  ['email', 'Email'],
                  ['tel', 'WhatsApp'],
                  ['ciudad', x('Ciudad', 'City')],
                ] as [keyof typeof form, string][]
              ).map(([k, l]) => (
                <label key={k} className="block min-w-0">
                  <span className="label">{l}</span>
                  <input className="input" value={form[k]} onChange={(ev) => set(k)(ev.target.value)} />
                </label>
              ))}
            </div>
            <button className="btn-primary mt-4" onClick={() => useApp.getState().toast(x('Perfil actualizado', 'Profile updated'))}>
              <Save size={16} /> {x('Guardar cambios', 'Save changes')}
            </button>
          </Card>
          <Card title={x('Mis reseñas', 'My reviews')}>
            {mine.length === 0 ? (
              <div className="text-sm text-muted">{x('Todavía no dejaste reseñas.', 'You haven’t left reviews yet.')}</div>
            ) : (
              <div className="space-y-3">
                {mine.map((r) => (
                  <div key={r.id} className="rounded-ctl border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{propById(r.propiedadId).nombre}</span>
                      <span className="text-xs text-muted">{fmtDate(r.fecha, 'MMM yyyy', lang)}</span>
                    </div>
                    <Stars value={r.rating} className="mt-1" />
                    <p className="mt-1 text-sm text-ink2">{b(r.texto)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title={x('Documento cargado', 'Uploaded ID')} actions={<Badge tone="ok">{x('Validado', 'Verified')}</Badge>}>
            <div className="grid grid-cols-2 gap-2">
              <DniSample side="front" />
              <DniSample side="back" />
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-ink2">
              <CreditCard size={16} className="text-accent" /> DNI <span className="num">{form.doc}</span>
            </div>
            <button className="btn-secondary mt-3 w-full" onClick={() => useApp.getState().toast(x('Te pedimos el documento nuevo en tu próxima reserva.', 'We’ll ask for the new ID on your next booking.'), 'info')}>
              {x('Actualizar documento', 'Update ID')}
            </button>
          </Card>
          <Card title={x('Notificaciones', 'Notifications')}>
            {(
              [
                ['wa', x('Confirmaciones por WhatsApp', 'Confirmations on WhatsApp')],
                ['app', x('Avisos dentro de la app', 'In-app alerts')],
                ['recordatorio', x('Recordatorio 48 h antes del check-in', 'Reminder 48 h before check-in')],
                ['promo', x('Novedades y casas nuevas', 'News and new homes')],
              ] as [keyof typeof prefs, string][]
            ).map(([k, l]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-line py-1 last:border-0">
                <span className="flex items-center gap-2 text-sm text-ink">
                  {k === 'promo' ? <Star size={15} className="text-muted" /> : <Bell size={15} className="text-muted" />}
                  {l}
                </span>
                <Switch
                  checked={prefs[k]}
                  label={l}
                  onChange={(v) => {
                    setPrefs({ ...prefs, [k]: v });
                    useApp.getState().toast(v ? x('Activado', 'Enabled') : x('Desactivado', 'Disabled'), 'info');
                  }}
                />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
