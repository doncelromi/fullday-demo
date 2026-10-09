import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as DM from '@radix-ui/react-dropdown-menu';
import { ArrowLeft, ChevronDown, Menu, MoreHorizontal } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { allowedFor, BOTTOM, NAV, ROLE_HOME, type NavItem } from '@/config/nav';
import { DemoPill, Logo } from '@/components/Brand';
import { Sheet } from '@/components/ui';
import { CtaBlock, LangToggle, NotifBell, RoleGrid, RoleSegmented, ThemeToggle, TourButton, UserMenu, WhatsAppButton } from './Controls';
import { useNavActions } from './useNavActions';
import { Toasts } from './Toasts';
import { WelcomeModal } from '@/features/WelcomeModal';
import { Tour } from '@/features/tour/Tour';
import { AIAssistant } from '@/features/ai/AIAssistant';

export const isActive = (item: NavItem, path: string) => {
  if (item.path === '/admin' || item.path === '/propietario') return path === item.path;
  if (item.id === 'explorar') return path === '/explorar' || path.startsWith('/propiedad/') || path.startsWith('/reservar/');
  return path === item.path || path.startsWith(item.path + '/');
};

/* ---------------- Barra superior desktop (menú arriba horizontal) ---------------- */
function TopBar() {
  const role = useApp((s) => s.role);
  const { pathname } = useLocation();
  const { t } = useT();
  const { goMenu } = useNavActions();
  const items = NAV[role];
  // Cuántas pills entran: se mide el ancho real disponible (cambia con rol, idioma y viewport)
  const navRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(items.length);
  useEffect(() => {
    const calc = () => {
      const nav = navRef.current;
      const m = measureRef.current;
      if (!nav || !m) return;
      const widths = Array.from(m.children).map((c) => (c as HTMLElement).offsetWidth + 4);
      const avail = nav.clientWidth;
      const total = widths.reduce((a, b) => a + b, 0);
      if (total <= avail) return setCount(items.length);
      let used = 86; // botón "Más ▾"
      let n = 0;
      while (n < widths.length && used + widths[n] <= avail) used += widths[n++];
      setCount(Math.max(1, n));
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (navRef.current) ro.observe(navRef.current);
    document.fonts?.ready.then(calc);
    return () => ro.disconnect();
  }, [items, t]);
  const overflow = items.slice(count);
  const pillCls = 'relative min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition';
  return (
    <header data-tour="top-nav" className="sticky top-0 z-50 hidden h-16 border-b border-line bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] backdrop-blur-md lg:block">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-5">
        <button onClick={() => goMenu('/propuesta')} className="flex shrink-0 items-center gap-2.5" aria-label="Full Day">
          <Logo size={30} />
        </button>
        <DemoPill className="hidden shrink-0 2xl:inline-flex" />
        <span className="h-6 w-px shrink-0 bg-line" />
        <div ref={navRef} className="relative min-w-0 flex-1">
          <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex gap-1">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <span key={it.id} className={cn(pillCls, 'inline-flex border')}>
                  <Icon size={15} />
                  {t(it.label)}
                  {it.id === 'propuesta' && <span className="ml-1 w-[78px]" />}
                </span>
              );
            })}
          </div>
          <nav className="flex min-w-0 items-center gap-1">
            {items.map((it, i) => {
              const active = isActive(it, pathname);
              const Icon = it.icon;
              const isProp = it.id === 'propuesta';
              return (
                <div key={it.id} className={cn(i < count ? 'flex' : 'hidden', 'shrink-0 items-center gap-1')}>
                  <button
                    data-tour={`nav-${it.id}`}
                    onClick={() => goMenu(it.path)}
                    className={cn(pillCls, 'flex', active ? 'bg-accent-soft text-accent' : 'text-ink2 hover:bg-subtle hover:text-ink', isProp && !active && 'border border-line-strong text-ink')}
                  >
                    <Icon size={15} />
                    {t(it.label)}
                  </button>
                  {isProp && (
                    <span className="flex items-center gap-1.5 pr-1">
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-accent">{t('nav.comercial')}</span>
                      <span className="h-5 w-px bg-line-strong" />
                    </span>
                  )}
                </div>
              );
            })}
            {overflow.length > 0 && (
              <DM.Root>
                <DM.Trigger asChild>
                  <button data-tour="nav-more" className={cn('flex min-h-[40px] shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-medium hover:bg-subtle', overflow.some((it) => isActive(it, pathname)) ? 'bg-accent-soft text-accent' : 'text-ink2')}>
                    {t('nav.more')} <ChevronDown size={14} />
                  </button>
                </DM.Trigger>
                <DM.Portal>
                  <DM.Content sideOffset={8} className="z-[90] w-56 rounded-card border border-line bg-card p-1.5 shadow-md">
                    {overflow.map((it) => {
                      const Icon = it.icon;
                      return (
                        <DM.Item key={it.id} onSelect={() => goMenu(it.path)} className={cn('flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] px-2.5 text-sm outline-none hover:bg-subtle focus:bg-subtle', isActive(it, pathname) ? 'text-accent' : 'text-ink')}>
                          <Icon size={16} className="text-muted" />
                          {t(it.label)}
                        </DM.Item>
                      );
                    })}
                  </DM.Content>
                </DM.Portal>
              </DM.Root>
            )}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <RoleSegmented />
          <TourButton />
          <LangToggle />
          <ThemeToggle />
          <NotifBell />
          <UserMenu />
          <WhatsAppButton className="ml-1 w-11 px-0 xl:w-auto xl:px-4" iconOnlyBelowXl />
        </div>
      </div>
    </header>
  );
}

/* ---------------- Topbar mobile ---------------- */
function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  const { t } = useT();
  const { goMenu } = useNavActions();
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-0.5 border-b border-line bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-1.5 backdrop-blur-md lg:hidden">
      <button className="icon-btn" onClick={onMenu} data-tour="mobile-menu" aria-label={t('nav.menu')}>
        <Menu size={20} />
      </button>
      <button onClick={() => goMenu('/propuesta')} className="flex min-w-0 items-center" aria-label="Full Day">
        <Logo size={26} />
      </button>
      <div className="ml-auto flex items-center">
        <TourButton compact />
        <LangToggle className="hidden sm:flex" />
        <ThemeToggle />
        <span className="hidden xs:inline-flex">
          <NotifBell />
        </span>
        <UserMenu />
      </div>
    </header>
  );
}

/* ---------------- Bottom nav mobile ---------------- */
function BottomNav({ onMore }: { onMore: () => void }) {
  const role = useApp((s) => s.role);
  const { pathname } = useLocation();
  const { t } = useT();
  const { goMenu } = useNavActions();
  const ref = useRef<HTMLElement>(null);
  const items = BOTTOM[role].map((id) => NAV[role].find((n) => n.id === id)!);
  const inMore = !items.some((it) => isActive(it, pathname));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const visible = getComputedStyle(el).display !== 'none';
      document.documentElement.style.setProperty('--bottom-nav-h', visible ? `${el.offsetHeight}px` : '0px');
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <nav ref={ref} data-tour="bottom-nav" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = isActive(it, pathname);
          const Icon = it.icon;
          return (
            <button key={it.id} data-tour={`tab-${it.id}`} onClick={() => goMenu(it.path)} className={cn('relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 text-[10.5px] font-medium', active ? 'text-accent' : 'text-muted')}>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
              <Icon size={20} />
              <span className="max-w-full truncate">{t(it.short ?? it.label)}</span>
              {it.id === 'propuesta' && <span className="absolute right-[calc(50%-16px)] top-2.5 h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
          );
        })}
        <button data-tour="tab-mas" onClick={onMore} className={cn('flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium', inMore ? 'text-accent' : 'text-muted')}>
          <MoreHorizontal size={20} />
          {t('nav.more')}
        </button>
      </div>
    </nav>
  );
}

/* ---------------- Sheet "Más" ---------------- */
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const role = useApp((s) => s.role);
  const { pathname } = useLocation();
  const { t } = useT();
  const { goMenu } = useNavActions();
  const rest = NAV[role].filter((n) => !BOTTOM[role].includes(n.id));
  return (
    <Sheet open={open} onClose={onClose} title={t('nav.menu')}>
      <div data-tour="more-sheet" className="space-y-5">
        <div className="grid gap-1">
          {(rest.length ? rest : NAV[role]).map((it) => {
            const Icon = it.icon;
            const active = isActive(it, pathname);
            return (
              <button
                key={it.id}
                onClick={() => {
                  goMenu(it.path);
                  onClose();
                }}
                className={cn('flex min-h-[48px] items-center gap-3 rounded-ctl px-3 text-left text-[15px] font-medium', active ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-subtle')}
              >
                <Icon size={18} className={active ? 'text-accent' : 'text-muted'} />
                {t(it.label)}
              </button>
            );
          })}
        </div>
        <div>
          <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">{t('top.changeView')}</div>
          <RoleGrid onDone={onClose} />
        </div>
        <div className="flex items-center justify-between rounded-ctl border border-line px-3 py-2 sm:hidden">
          <span className="text-sm text-ink2">{t('top.lang')}</span>
          <LangToggle />
        </div>
        <CtaBlock compact dataTour="whatsapp-cta-mobile" />
      </div>
    </Sheet>
  );
}

/* ---------------- Botón de retorno de previsualización ---------------- */
function PreviewReturn() {
  const preview = useApp((s) => s.preview);
  const trailer = useApp((s) => s.trailer);
  const navigate = useNavigate();
  const { t, b } = useT();
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) {
        useApp.getState().cerrarPreview();
        navigate('/propuesta');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview, navigate]);
  if (!preview || trailer) return null;
  return (
    <div className="no-print fixed left-4 top-[64px] z-[60] flex max-w-[calc(100vw-32px)] flex-wrap items-center gap-2 lg:top-[76px]">
      <button
        onClick={() => {
          useApp.getState().cerrarPreview();
          navigate('/propuesta');
        }}
        className="halo relative isolate inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg shadow-md"
      >
        <ArrowLeft size={16} />
        {t('preview.back')}
      </button>
      <span className="inline-flex min-h-[32px] items-center rounded-full border border-white/40 bg-[color-mix(in_srgb,var(--card)_70%,transparent)] px-3 text-xs text-ink2 shadow-sm backdrop-blur-md">
        {t('preview.viewing')}&nbsp;<b className="font-semibold text-ink">{b(preview.titulo)}</b>
      </span>
    </div>
  );
}

/* ---------------- Shell ---------------- */
export function AppShell() {
  const authed = useApp((s) => s.authed);
  const role = useApp((s) => s.role);
  const preview = useApp((s) => s.preview);
  const trailer = useApp((s) => s.trailer);
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMore(false);
  }, [pathname]);

  if (!authed && !trailer) return <Navigate to="/login" replace />;
  if (!allowedFor(role, pathname) && !preview && !trailer) return <Navigate to={ROLE_HOME[role]} replace />;

  return (
    <div className="min-h-[100dvh] bg-bg">
      <TopBar />
      <MobileTopBar onMenu={() => setMore(true)} />
      <PreviewReturn />
      <main className={cn('mx-auto w-full max-w-[1400px] px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-8', preview && !trailer && 'pt-[108px] sm:pt-[76px] lg:pt-[84px]')}>
        <Outlet />
      </main>
      <footer className="mx-auto max-w-[1400px] px-4 pb-[calc(var(--fixed-bottom-stack)+24px)] sm:px-6 lg:px-8 lg:pb-10" data-no-print>
        <CtaBlock />
      </footer>
      <BottomNav onMore={() => setMore(true)} />
      <MoreSheet open={more} onClose={() => setMore(false)} />
      <Toasts />
      <WelcomeModal />
      <Tour openMore={setMore} />
      {!trailer && <AIAssistant />}
    </div>
  );
}
