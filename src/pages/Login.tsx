import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BarChart3, CalendarCheck, Eye, EyeOff, LogIn, MessageCircle, PlayCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { DEMO_ACCOUNTS, DEMO_PASS, ROLE_PERSON } from '@/data/users';
import { WHATSAPP_URL, cn } from '@/lib/utils';
import { DemoPill, Logo, LogoMark } from '@/components/Brand';
import { Avatar } from '@/components/ui';
import { LangToggle, ThemeToggle } from '@/layout/Controls';
import { Toasts } from '@/layout/Toasts';
import type { Role } from '@/types';

function Hero() {
  const { t } = useT();
  const feats = [
    { k: 'login.f1', icon: Sparkles },
    { k: 'login.f2', icon: ShieldCheck },
    { k: 'login.f3', icon: CalendarCheck },
    { k: 'login.f4', icon: BarChart3 },
  ];
  return (
    <section className="relative hidden w-[55%] overflow-hidden border-r border-line bg-bg lg:flex lg:flex-col">
      {/* blobs oliva / arena muy suaves */}
      <div className="pointer-events-none absolute -left-24 top-16 h-[440px] w-[440px] rounded-full bg-[#e2601a]/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-36 right-[-60px] h-[480px] w-[480px] rounded-full bg-[#273469]/15 blur-[130px] dark:bg-[#273469]/30" />
      <div className="relative z-10 flex h-full flex-col px-12 py-10 xl:px-16">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-card/80 py-1 pl-1 pr-3.5 text-[12px] font-semibold text-ink shadow-sm backdrop-blur">
            <LogoMark size={30} />
            {t('login.brand')}
          </span>
          <DemoPill />
        </div>
        <div className="my-auto max-w-xl py-12">
          <h1 className="text-[44px] font-extrabold leading-[1.06] tracking-tight text-navy xl:text-[54px]">
            {t('login.h1a')}
            <br />
            <span className="text-accent">{t('login.h1b')}</span>
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink2">{t('login.sub')}</p>
          <ul className="mt-9 grid gap-3 sm:grid-cols-2">
            {feats.map(({ k, icon: Icon }, i) => (
              <li key={k} className="flex items-start gap-3 rounded-card border border-line bg-card/70 p-3.5 backdrop-blur" style={{ animation: 'stagger .5s ease both', animationDelay: `${200 + i * 90}ms` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{t(k)}</span>
                  <span className="block text-[12.5px] text-ink2">{t(k + 'd')}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <svg aria-hidden viewBox="0 0 800 140" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-[150px] w-full text-navy opacity-[0.10] dark:opacity-25">
          <path fill="currentColor" d="M0 140 L0 96 L90 62 L150 80 L240 30 L310 58 L380 18 L455 64 L520 44 L600 76 L680 36 L760 70 L800 56 L800 140 Z" />
        </svg>
        <div className="relative flex items-center justify-between border-t border-line pt-5 text-[12px] text-muted">
          <span>{t('login.place')}</span>
          <span className="text-[10px] uppercase tracking-[0.14em]">Powered by Insights</span>
        </div>
      </div>
    </section>
  );
}

export default function Login() {
  const authed = useApp((s) => s.authed);
  const login = useApp((s) => s.login);
  const { t, e } = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<Role | null>(null);

  if (authed) return <Navigate to="/propuesta" replace />;

  // Auto-fill por rol: completa SIN enviar
  const fill = (role: Role) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.role === role)!;
    setEmail(acc.email);
    setPass(DEMO_PASS);
    setActive(role);
    setError(false);
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const acc = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    if (!acc || pass !== DEMO_PASS) {
      setError(true);
      return;
    }
    login(acc.role);
    // SIEMPRE a /propuesta, con cualquier rol
    navigate('/propuesta', { replace: true });
  };

  const startTrailer = () => {
    const s = useApp.getState();
    s.setRole('admin');
    s.setTrailer(true);
    navigate('/propuesta');
  };

  return (
    <div className="flex min-h-[100dvh] bg-bg">
      <Hero />
      <section className="flex w-full flex-col lg:w-[45%]">
        <div className="flex items-center justify-between gap-2 px-4 pt-3 sm:px-8 lg:justify-end lg:pt-6">
          <div className="lg:hidden">
            <Logo size={28} sub="Chacras de Coria" />
          </div>
          <div className="flex items-center gap-1">
            <DemoPill className="hidden sm:inline-flex" />
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-3 sm:hidden">
              <DemoPill />
            </div>
            <h2 className="text-[26px] font-bold tracking-tight text-ink">{t('login.welcome')}</h2>
            <p className="mt-1 text-sm text-ink2">{t('login.welcomeSub')}</p>

            <form onSubmit={submit} className="card mt-6 space-y-4 p-5 shadow-md sm:p-6">
              <div>
                <label className="label" htmlFor="email">
                  {t('login.user')}
                </label>
                <input id="email" className="input" type="email" autoComplete="username" placeholder={t('login.userPh')} value={email} onChange={(ev) => setEmail(ev.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="pass">
                  {t('login.pass')}
                </label>
                <div className="relative">
                  <input id="pass" className="input pr-12" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={pass} onChange={(ev) => setPass(ev.target.value)} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted hover:text-ink" aria-label={t('login.showPass')}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 text-[13px]">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-ink2">
                  <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} className="h-4 w-4 accent-[var(--accent)]" />
                  {t('login.remember')}
                </label>
                <button type="button" className="min-h-[44px] font-medium text-accent hover:underline" onClick={() => useApp.getState().toast(t('login.forgotToast'), 'info')}>
                  {t('login.forgot')}
                </button>
              </div>
              {error && <div className="rounded-ctl border border-danger/30 bg-danger/[0.07] px-3 py-2 text-[13px] text-danger">{t('login.error')}</div>}
              <button type="submit" className="btn-primary w-full">
                <LogIn size={16} />
                {t('login.submit')}
              </button>

              <div className="pt-1">
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">{t('login.quick')}</div>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((a) => {
                    const p = ROLE_PERSON[a.role];
                    return (
                      <button
                        type="button"
                        key={a.role}
                        onClick={() => fill(a.role)}
                        className={cn('flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-ctl border px-1.5 py-2 text-center transition', active === a.role ? 'border-accent bg-accent-soft' : 'border-line bg-card hover:border-line-strong')}
                      >
                        <Avatar name={p.nombre} role={a.role} size={24} />
                        <span className="block max-w-full truncate text-[12.5px] font-semibold text-ink">{e('role', a.role)}</span>
                        <span className="block max-w-full truncate text-[10.5px] text-muted">{p.nombre.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>

            <div className="mt-5 flex flex-col items-center gap-1 text-[13px]">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center gap-2 font-medium text-ink2 hover:text-accent">
                <MessageCircle size={15} />
                {t('login.noAccess')}
              </a>
              <button onClick={startTrailer} className="hidden min-h-[44px] items-center gap-2 font-semibold text-accent hover:underline lg:inline-flex">
                <PlayCircle size={16} />
                {t('login.trailer')}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted">{t('login.legal')}</p>
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-muted lg:hidden">Powered by Insights</p>
          </div>
        </div>
      </section>
      <Toasts />
    </div>
  );
}
