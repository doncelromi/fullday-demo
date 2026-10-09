import { useMemo } from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Bell, LogOut, MessageCircle, Moon, Sparkles, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { cn, WHATSAPP_URL } from '@/lib/utils';
import { ROLES } from '@/config/nav';
import { ROLE_PERSON } from '@/data/users';
import { notifsFor } from '@/data/selectors';
import { fmtRelative } from '@/lib/format';
import { Avatar } from '@/components/ui';
import { DemoPill } from '@/components/Brand';
import { useNavActions } from './useNavActions';

export function LangToggle({ className }: { className?: string }) {
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  return (
    <div className={cn('flex items-center rounded-full border border-line bg-subtle p-0.5 text-[11px] font-semibold', className)} role="group" aria-label="Idioma / Language">
      {(['es', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className={cn('min-h-[34px] min-w-[34px] rounded-full px-2 uppercase transition', lang === l ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink')} aria-pressed={lang === l}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const theme = useApp((s) => s.theme);
  const toggle = useApp((s) => s.toggleTheme);
  const { t } = useT();
  return (
    <button className="icon-btn" onClick={toggle} aria-label={t('top.theme')} title={t('top.theme')}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function TourButton({ compact }: { compact?: boolean }) {
  const start = useApp((s) => s.startTour);
  const trailer = useApp((s) => s.trailer);
  const { t } = useT();
  return (
    <button
      data-tour="tour-btn"
      onClick={() => !trailer && start()}
      className={cn('inline-flex min-h-[44px] items-center gap-1.5 rounded-full text-[13px] font-semibold text-accent transition hover:bg-accent-soft', compact ? 'min-w-[44px] justify-center px-2' : 'px-3')}
    >
      <Sparkles size={16} />
      <span className={compact ? 'sr-only' : ''}>{t('top.tour')}</span>
    </button>
  );
}

export function WhatsAppButton({ className, iconOnlyBelowXl }: { className?: string; iconOnlyBelowXl?: boolean }) {
  const { t } = useT();
  return (
    <a href={WHATSAPP_URL} target="_blank" rel="noopener" data-tour="whatsapp-cta" className={cn('btn-primary', className)} aria-label={t('top.cta')}>
      <MessageCircle size={16} />
      <span className={iconOnlyBelowXl ? 'hidden xl:inline' : ''}>{t('top.cta')}</span>
    </a>
  );
}

/** Segmentado compacto "Admin · Propietario · Cliente" (desktop) */
export function RoleSegmented() {
  const role = useApp((s) => s.role);
  const { e } = useT();
  const { switchRole } = useNavActions();
  return (
    <div data-tour="switch-user" className="flex items-center rounded-full border border-line bg-subtle p-0.5" role="tablist" aria-label="Rol">
      {ROLES.map((r) => (
        <button
          key={r}
          role="tab"
          aria-selected={role === r}
          onClick={() => r !== role && switchRole(r)}
          className={cn('min-h-[34px] rounded-full px-2.5 text-[12px] font-semibold transition', role === r ? 'bg-accent text-accent-fg shadow-sm' : 'text-ink2 hover:text-ink')}
        >
          {e('role', r)}
        </button>
      ))}
    </div>
  );
}

export function RoleGrid({ onDone }: { onDone?: () => void }) {
  const role = useApp((s) => s.role);
  const { e, t } = useT();
  const { switchRole } = useNavActions();
  return (
    <div className="grid gap-2" data-tour="switch-user">
      {ROLES.map((r) => {
        const p = ROLE_PERSON[r];
        return (
          <button
            key={r}
            onClick={() => {
              if (r !== role) switchRole(r);
              onDone?.();
            }}
            className={cn('flex min-h-[56px] items-center gap-3 rounded-card border px-3 text-left transition', r === role ? 'border-accent bg-accent-soft' : 'border-line bg-card hover:border-line-strong')}
          >
            <Avatar name={p.nombre} role={r} size={32} />
            <div className="min-w-0 flex-1">
              <div className={cn('text-[14px] font-semibold leading-tight', r === role ? 'text-accent' : 'text-ink')}>{e('role', r)}</div>
              <div className="truncate text-[12px] text-muted">{t(`role.${r}.sub`)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function NotifBell() {
  const role = useApp((s) => s.role);
  const all = useApp((s) => s.notifs);
  const { t, b, lang } = useT();
  const navigate = useNavigate();
  const mine = useMemo(() => notifsFor(all, role), [all, role]);
  const unread = mine.filter((n) => !n.leida).length;
  const path = role === 'admin' ? '/admin/notificaciones' : role === 'propietario' ? '/propietario/notificaciones' : '/notificaciones';
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button className="icon-btn relative" aria-label={t('top.notifs')}>
          <Bell size={18} />
          {unread > 0 && <span className="num absolute right-1 top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content sideOffset={8} align="end" className="z-[90] w-[min(360px,calc(100vw-24px))] rounded-card border border-line bg-card p-1.5 shadow-md">
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
            <span className="text-sm font-semibold text-ink">{t('top.notifs')}</span>
            <span className="num text-xs text-muted">{unread}</span>
          </div>
          {mine.slice(0, 5).map((n) => (
            <DM.Item key={n.id} onSelect={() => navigate(path)} className="flex min-h-[48px] cursor-pointer gap-2.5 rounded-[8px] px-2.5 py-2 outline-none hover:bg-subtle focus:bg-subtle">
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.leida ? 'bg-transparent' : 'bg-accent')} />
              <span className="min-w-0">
                <span className="line-clamp-2 block text-[13px] text-ink">{b(n.texto)}</span>
                <span className="text-[11px] text-muted">{fmtRelative(n.fecha, lang)}</span>
              </span>
            </DM.Item>
          ))}
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item onSelect={() => navigate(path)} className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-[8px] text-sm font-semibold text-accent outline-none hover:bg-subtle focus:bg-subtle">
            {t('top.seeAll')}
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function UserMenu() {
  const role = useApp((s) => s.role);
  const logout = useApp((s) => s.logout);
  const navigate = useNavigate();
  const { t, e } = useT();
  const p = ROLE_PERSON[role];
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-subtle" aria-label={p.nombre}>
          <Avatar name={p.nombre} role={role} size={32} />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content sideOffset={8} align="end" className="z-[90] w-64 rounded-card border border-line bg-card p-1.5 shadow-md">
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar name={p.nombre} role={role} size={36} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{p.nombre}</div>
              <div className="truncate text-xs text-muted">
                {e('role', role)} · {p.email}
              </div>
            </div>
          </div>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item
            onSelect={() => {
              logout();
              navigate('/login');
            }}
            className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] px-2.5 text-sm text-ink outline-none hover:bg-subtle focus:bg-subtle"
          >
            <LogOut size={16} /> {t('top.logout')}
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function CtaBlock({ compact, dataTour }: { compact?: boolean; dataTour?: string }) {
  const { t } = useT();
  return (
    <div className={cn('rounded-panel border border-line bg-subtle text-center', compact ? 'p-4' : 'p-6 sm:p-8')} data-no-print data-tour={dataTour}>
      <DemoPill />
      <p className={cn('mx-auto mt-3 max-w-md font-semibold text-ink', compact ? 'text-[15px]' : 'text-lg')}>{t('cta.title')}</p>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="btn-primary mt-4">
        <MessageCircle size={16} />
        {t('cta.button')}
      </a>
      <div className="mt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{t('cta.powered')}</div>
    </div>
  );
}
