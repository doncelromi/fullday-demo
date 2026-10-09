import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MousePointer2, X } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { sleep, WHATSAPP_URL } from '@/lib/utils';
import { LogoMark } from '@/components/Brand';
import type { Role } from '@/types';

export interface TrailerScene {
  view?: string;
  role?: Role;
  selector?: string;
  click?: boolean;
  position?: 'center' | 'top';
  chapter: string;
  title: string;
  body: string;
  duration: number;
  cta?: boolean;
  /** extensiones del motor: clics previos en secuencia y scroll por secciones */
  clicks?: string[];
  scroll?: string[];
}

const SCENES: TrailerScene[] = [
  { view: '/propuesta', role: 'admin', chapter: 'tr.ch1', title: 'tr.t1', body: 'tr.b1', duration: 8000, scroll: ['[data-trailer="circuito"]', '[data-trailer="modulos"]'] },
  { view: '/explorar', role: 'cliente', selector: '[data-trailer="buscador"]', chapter: 'tr.ch2', title: 'tr.t2', body: 'tr.b2', duration: 6500 },
  { view: '/propiedad/casa-del-olivar', role: 'cliente', selector: '[data-tour="booking-card"]', chapter: 'tr.ch2', title: 'tr.t3', body: 'tr.b3', duration: 6500 },
  { view: '/reservar/casa-del-olivar', role: 'cliente', selector: '[data-trailer="countdown"]', chapter: 'tr.ch4', title: 'tr.t4', body: 'tr.b4', duration: 6000 },
  { view: '/reservar/casa-del-olivar', role: 'cliente', clicks: ['[data-trailer="btn-continuar"]', '[data-trailer="btn-continuar"]', '[data-trailer="sample-doc"]'], selector: '[data-trailer="identidad"]', chapter: 'tr.ch4', title: 'tr.t5', body: 'tr.b5', duration: 9000 },
  { view: '/reservar/casa-del-olivar', role: 'cliente', clicks: ['[data-trailer="btn-continuar"]', '[data-trailer="btn-pagar"]', '[data-trailer="mp-confirm"]'], selector: '[data-trailer="mp-checkout"]', chapter: 'tr.ch4', title: 'tr.t6', body: 'tr.b6', duration: 8500 },
  { view: '/reservar/casa-del-olivar', role: 'cliente', selector: '[data-trailer="confirmacion"]', chapter: 'tr.ch4', title: 'tr.t7', body: 'tr.b7', duration: 7000 },
  { view: '/propietario/calendario', role: 'propietario', selector: '[data-trailer="calendario"]', chapter: 'tr.ch8', title: 'tr.t8', body: 'tr.b8', duration: 7000 },
  { view: '/admin/pagos', role: 'admin', selector: '[data-trailer="btn-webhook"]', click: true, chapter: 'tr.ch9', title: 'tr.t9', body: 'tr.b9', duration: 7500 },
  { view: '/admin/metricas', role: 'admin', selector: '[data-trailer="top5"]', chapter: 'tr.ch9', title: 'tr.t10', body: 'tr.b10', duration: 7000 },
  { chapter: 'tr.ch11', title: 'tr.t11', body: 'tr.b11', duration: 8000, cta: true, position: 'center' },
];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Trailer() {
  const trailer = useApp((s) => s.trailer);
  const navigate = useNavigate();
  const navRef = useRef(navigate); // guardado en ref: nunca en dependencias del motor
  navRef.current = navigate;
  const { t } = useT();
  const [i, setI] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0, show: false });
  const [ring, setRing] = useState<Box | null>(null);
  const [pressed, setPressed] = useState(false);
  const [sceneStart, setSceneStart] = useState(0);

  const exit = () => {
    const s = useApp.getState();
    s.setTrailer(false);
    s.setRole('admin');
    window.scrollTo(0, 0);
    navRef.current('/login');
  };

  useEffect(() => {
    if (!trailer) return;
    let cancelled = false;
    const alive = () => !cancelled && useApp.getState().trailer;
    setCursor({ x: window.innerWidth / 2, y: window.innerHeight / 2, show: false });

    const find = async (sel: string) => {
      let el = document.querySelector<HTMLElement>(sel);
      for (let tries = 0; (!el || el.getBoundingClientRect().width === 0) && tries < 15; tries++) {
        await sleep(200);
        el = document.querySelector<HTMLElement>(sel);
      }
      return el;
    };

    const pointAt = async (el: HTMLElement) => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await sleep(500);
      const r = el.getBoundingClientRect();
      setCursor({ x: r.left + Math.min(r.width / 2, 140), y: r.top + Math.min(r.height / 2, 40), show: true });
      await sleep(950);
    };

    const press = async (el: HTMLElement) => {
      setPressed(true);
      await sleep(160);
      setPressed(false);
      el.click();
    };

    const run = async () => {
      let k = 0;
      while (alive()) {
        const sc = SCENES[k];
        setI(k);
        setRing(null);
        setSceneStart(Date.now());
        const t0 = Date.now();
        const s = useApp.getState();
        if (sc.role && s.role !== sc.role) {
          s.setRole(sc.role);
          await sleep(90); // esperar el cambio de rol antes de navegar
        }
        if (sc.view) {
          const cur = window.location.pathname + window.location.search;
          if (cur !== sc.view) {
            navRef.current(sc.view);
            window.scrollTo(0, 0);
          }
          await sleep(700);
        }
        if (!alive()) return;

        if (sc.scroll) {
          for (const sel of sc.scroll) {
            document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            await sleep(2600);
            if (!alive()) return;
          }
        }

        if (sc.clicks) {
          for (const sel of sc.clicks) {
            const el = await find(sel);
            if (!el || !alive()) break;
            await pointAt(el);
            if (!alive()) return;
            await press(el);
            await sleep(sel.includes('mp-confirm') ? 2900 : sel.includes('sample-doc') ? 900 : 700);
          }
        }

        if (sc.selector) {
          const el = await find(sc.selector);
          if (el && alive()) {
            await pointAt(el);
            const r = el.getBoundingClientRect();
            setRing({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: Math.min(r.height + 12, window.innerHeight - r.top) });
            if (sc.click) {
              await sleep(300);
              await press(el);
              await sleep(500);
            }
          }
        } else {
          setCursor((c) => ({ ...c, show: false }));
        }

        const rest = sc.duration - (Date.now() - t0);
        if (rest > 0) await sleep(rest);
        if (!alive()) return;
        k = (k + 1) % SCENES.length;
        if (k === 0) window.scrollTo(0, 0);
      }
    };
    run();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && exit();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailer]);

  // Mantener el anillo pegado al elemento si la página scrollea
  useEffect(() => {
    if (!trailer) return;
    const sel = SCENES[i]?.selector;
    if (!sel) return;
    const on = () => {
      const el = document.querySelector(sel);
      if (!el || !ring) return;
      const r = el.getBoundingClientRect();
      setRing({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: Math.min(r.height + 12, window.innerHeight - r.top) });
    };
    window.addEventListener('scroll', on, true);
    return () => window.removeEventListener('scroll', on, true);
  }, [trailer, i, ring]);

  if (!trailer) return null;
  const sc = SCENES[i];

  return createPortal(
    <div data-no-print>
      <div className="fixed inset-0 z-[9990]" style={{ background: sc.cta ? 'rgba(28,35,71,.94)' : 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.18))' }} />
      {ring && (
        <div
          className="pointer-events-none fixed z-[9991] rounded-[16px] transition-all duration-500"
          style={{ left: ring.x, top: ring.y, width: ring.w, height: ring.h, boxShadow: '0 0 0 3px var(--accent), 0 0 0 10px color-mix(in srgb, var(--accent) 22%, transparent)' }}
        />
      )}
      {cursor.show && (
        <div className="pointer-events-none fixed z-[9992]" style={{ left: cursor.x, top: cursor.y, transition: 'left .9s cubic-bezier(.65,0,.35,1), top .9s cubic-bezier(.65,0,.35,1)' }}>
          <MousePointer2 size={30} className="drop-shadow-lg" style={{ fill: '#3b82f6', color: '#fff', scale: pressed ? '0.82' : '1', transition: 'scale .12s' }} />
          {pressed && <span className="absolute -left-3 -top-3 h-8 w-8 animate-ping rounded-full bg-blue-500/50" />}
        </div>
      )}
      {sc.cta ? (
        <div className="fixed inset-0 z-[9993] m-auto flex h-fit w-[min(640px,calc(100vw-32px))] flex-col items-center text-center text-white">
          <LogoMark size={112} />
          <h2 className="mt-8 text-[44px] font-bold leading-tight tracking-tight">{t(sc.title)}</h2>
          <p className="mt-3 text-lg text-white/70">{t(sc.body)}</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="btn mt-8 bg-accent px-7 text-base text-white hover:bg-accent-hover">
            <MessageCircle size={18} />
            {t('tr.cta')}
          </a>
          <div className="mt-6 text-[10px] uppercase tracking-[0.16em] text-white/50">Powered by Insights</div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-8 z-[9993] mx-auto w-[min(720px,calc(100vw-48px))] overflow-hidden rounded-panel border border-white/20 bg-[rgba(28,35,71,.78)] px-6 py-4 text-white shadow-md backdrop-blur-xl">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f9a26c]">
            <span className="num">
              {String(i + 1).padStart(2, '0')} / {SCENES.length}
            </span>
            <span className="h-3 w-px bg-white/25" />
            {t(sc.chapter)}
          </div>
          <div className="mt-1.5 text-[20px] font-semibold tracking-tight">{t(sc.title)}</div>
          <div className="mt-0.5 text-[14px] text-white/75">{t(sc.body)}</div>
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
            <div key={sceneStart} className="h-full bg-accent" style={{ animation: `trailerbar ${sc.duration}ms linear both` }} />
          </div>
        </div>
      )}
      <button onClick={exit} className="fixed right-5 top-[80px] z-[9994] inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 bg-[rgba(28,35,71,.8)] px-4 text-sm font-medium text-white backdrop-blur-md hover:bg-[rgba(28,35,71,.95)]">
        <X size={16} />
        {t('tr.exit')} <span className="text-white/50">Esc</span>
      </button>
    </div>,
    document.body,
  );
}
