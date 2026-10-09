import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Sparkles } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { metrics, periodOf, top5 } from '@/data/selectors';
import { fmtARSShort } from '@/lib/format';
import { Modal } from '@/components/ui';
import { WHATSAPP_URL } from '@/lib/utils';
import { getTourSteps, type TourData } from './steps';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 8;
const R = 14;

function useIsMobile() {
  const q = '(max-width: 1023px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

const visible = (el: Element | null): el is HTMLElement => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
};

function holePath(W: number, H: number, r: Rect) {
  const { x, y, w, h } = r;
  const rr = Math.min(R, w / 2, h / 2);
  return `path(evenodd, "M0 0 H${W} V${H} H0 Z M${x + rr} ${y} H${x + w - rr} A${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V${y + h - rr} A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} H${x + rr} A${rr} ${rr} 0 0 1 ${x} ${y + h - rr} V${y + rr} A${rr} ${rr} 0 0 1 ${x + rr} ${y} Z")`;
}

export function Tour(_props: { openMore: (v: boolean) => void }) {
  const tourRun = useApp((s) => s.tourRun);
  const role = useApp((s) => s.role);
  const lang = useApp((s) => s.lang);
  const trailer = useApp((s) => s.trailer);
  const reservas = useApp((s) => s.reservas);
  const esMobile = useIsMobile();
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;
  const { pathname } = useLocation();
  const { t } = useT();

  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [finalOpen, setFinalOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(220);

  const data: TourData = useMemo(() => {
    const t5 = top5(reservas, periodOf('3m'));
    return { rev: fmtARSShort(metrics(reservas, periodOf('month')).revenue, lang), top: t5[0]?.nombre ?? '', topN: t5[0]?.count ?? 0 };
  }, [reservas, lang]);

  const steps = useMemo(() => getTourSteps(role, lang, esMobile, data), [role, lang, esMobile, data]);
  const step = active ? steps[idx] : undefined;

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  }, []);

  const teardown = useCallback(
    (finished: boolean) => {
      clearTimers();
      setActive(false);
      setRect(null);
      useApp.getState().setTourActive(false);
      const key = `fd_tour_completed_${useApp.getState().role}`;
      try {
        localStorage.setItem(key, '1');
      } catch {
        /* noop */
      }
      if (finished) setFinalOpen(true);
    },
    [clearTimers],
  );

  // Arranque MANUAL únicamente: cada incremento de tourRun (botón ✨ Tour)
  useEffect(() => {
    if (tourRun === 0) return;
    if (useApp.getState().trailer) return;
    useApp.getState().cancelarPreview();
    setIdx(0);
    setRect(null);
    setActive(true);
    useApp.getState().setTourActive(true);
  }, [tourRun]);

  // Reinicio si cambia el rol o el idioma con el tour abierto
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setIdx(0);
  }, [role, lang]);

  useEffect(() => {
    if (trailer && active) teardown(false);
  }, [trailer, active, teardown]);

  // Medición
  const findEl = useCallback(() => {
    if (!step?.target) return null;
    let el: Element | null = document.querySelector(`[data-tour="${step.target}"]`);
    if (!visible(el) && step.fallback) el = document.querySelector(`[data-tour="${step.fallback}"]`);
    return visible(el) ? el : null;
  }, [step]);

  const measure = useCallback(() => {
    const el = findEl();
    if (!el) return false;
    const r = el.getBoundingClientRect();
    setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
    setVp({ w: window.innerWidth, h: window.innerHeight });
    return true;
  }, [findEl]);

  useEffect(() => {
    if (!active || !step) return;
    clearTimers();
    setRect(null);
    if (step.route && step.route !== pathname) navRef.current(step.route);
    if (!step.target) {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      return;
    }
    const go = () => {
      const el = findEl();
      if (el) el.scrollIntoView({ block: 'center' }); // CLAVE antes de medir
      timers.current.push(
        window.setTimeout(() => {
          if (!measure()) timers.current.push(window.setTimeout(() => measure(), 220));
        }, 260),
      );
    };
    timers.current.push(window.setTimeout(go, step.route && step.route !== pathname ? 120 : 0));
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, idx, step?.id, esMobile]);

  // Re-medir en resize/scroll (sin volver a scrollIntoView)
  useEffect(() => {
    if (!active) return;
    const on = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (step?.target) measure();
    };
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, true);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('scroll', on, true);
    };
  }, [active, step, measure]);

  useEffect(() => {
    if (tipRef.current) setTipH(tipRef.current.offsetHeight);
  });

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') teardown(false);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const next = () => {
    if (idx >= steps.length - 1) teardown(true);
    else setIdx(idx + 1);
  };

  // Posición del tooltip
  const tipW = Math.min(360, vp.w - 24);
  let tipStyle: React.CSSProperties;
  const centered = !step?.target || !rect;
  if (centered) {
    tipStyle = { left: '50%', top: '50%', translate: '-50% -50%', width: tipW };
  } else {
    const gap = 14;
    const below = rect.y + rect.h + gap;
    const above = rect.y - gap - tipH;
    let top: number;
    if (below + tipH <= vp.h - 12) top = below;
    else if (above >= 12) top = above;
    else top = Math.max(12, Math.min(vp.h - tipH - 12, rect.y + rect.h / 2 - tipH / 2));
    let left = rect.x + rect.w / 2 - tipW / 2;
    left = Math.max(12, Math.min(vp.w - tipW - 12, left));
    tipStyle = { left, top, width: tipW };
  }

  const waitingTarget = !!step?.target && !rect;

  return (
    <>
      {active &&
        step &&
        createPortal(
          <div className="fixed inset-0 z-[9000]" data-no-print aria-live="polite">
            {/* Overlay con agujero redondeado (clip-path evenodd) */}
            <div
              className="absolute inset-0 transition-[clip-path] duration-300"
              style={{
                background: 'rgba(10,10,10,.55)',
                clipPath: rect ? holePath(vp.w, vp.h, rect) : undefined,
              }}
            />
            {rect && (
              <>
                <div
                  className="pointer-events-none absolute rounded-[14px] transition-all duration-300"
                  style={{
                    left: rect.x,
                    top: rect.y,
                    width: rect.w,
                    height: rect.h,
                    boxShadow: '0 0 0 2px var(--accent), 0 0 22px 2px color-mix(in srgb, var(--accent) 55%, transparent)',
                  }}
                />
                <span className="pointer-events-none absolute flex h-3.5 w-3.5" style={{ left: rect.x + rect.w - 8, top: rect.y - 6 }}>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500" />
                </span>
              </>
            )}
            {!waitingTarget && (
              <div ref={tipRef} role="dialog" className="fade-up absolute rounded-card border border-line bg-card p-5 shadow-md" style={tipStyle}>
                <div className="flex items-center justify-between gap-2">
                  <span className="pill bg-accent-soft text-accent">
                    <Sparkles size={11} />
                    <span className="num">{t('tour.step', { x: idx + 1, y: steps.length })}</span>
                  </span>
                  <button onClick={() => teardown(false)} className="min-h-[36px] px-1 text-xs font-medium text-muted hover:text-ink">
                    {t('tour.skip')}
                  </button>
                </div>
                <h3 className="mt-3 text-[17px] font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink2">{step.body}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    {steps.map((s, i) => (
                      <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-accent' : 'w-1.5 bg-line-strong'}`} />
                    )).slice(Math.max(0, Math.min(idx - 4, steps.length - 9)), Math.max(9, idx + 5))}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {idx > 0 && (
                      <button className="btn-secondary btn-sm min-h-[40px]" onClick={() => setIdx(idx - 1)}>
                        {t('tour.back')}
                      </button>
                    )}
                    <button className="btn-primary btn-sm min-h-[40px]" onClick={next}>
                      {idx === steps.length - 1 ? t('tour.finish') : t('tour.next')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
      <Modal open={finalOpen} onClose={() => setFinalOpen(false)} width={460}>
        <div className="py-2 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkles size={22} />
          </span>
          <h3 className="mt-4 text-xl font-bold tracking-tight text-ink">{t('tour.endTitle')}</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink2">{t('tour.endBody')}</p>
          <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
            <button className="btn-secondary" onClick={() => setFinalOpen(false)}>
              {t('tour.explore')}
            </button>
            <a className="btn-primary" href={WHATSAPP_URL} target="_blank" rel="noopener" onClick={() => setFinalOpen(false)}>
              <MessageCircle size={16} />
              {t('tour.wantApp')}
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
