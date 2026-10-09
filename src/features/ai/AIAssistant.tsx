import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUp, Sparkles, X } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { answer, GREETING, SUGGESTIONS, type BotAction } from './responses';

interface Msg {
  id: number;
  from: 'bot' | 'me';
  text: string;
  action?: BotAction;
  done?: boolean;
}

let mid = 1;

export function AIAssistant() {
  const role = useApp((s) => s.role);
  const lang = useApp((s) => s.lang);
  const tourActive = useApp((s) => s.tourActive);
  const navigate = useNavigate();
  const { t, b } = useT();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const clear = () => {
    timers.current.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    timers.current = [];
  };

  // Reinicia la conversación al cambiar de rol o idioma
  useEffect(() => {
    clear();
    setThinking(false);
    setTyping(false);
    setMsgs([{ id: mid++, from: 'bot', text: GREETING[role][lang === 'es' ? 0 : 1], done: true }]);
  }, [role, lang]);

  useEffect(() => () => clear(), []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, thinking]);

  const ask = useCallback(
    (q: string) => {
      if (!q.trim() || thinking || typing) return;
      const s = useApp.getState();
      setMsgs((m) => [...m, { id: mid++, from: 'me', text: q, done: true }]);
      setInput('');
      setThinking(true);
      const res = answer(q, s.role, s.lang, s);
      timers.current.push(
        window.setTimeout(() => {
          setThinking(false);
          setTyping(true);
          const id = mid++;
          setMsgs((m) => [...m, { id, from: 'bot', text: '', action: res.action }]);
          let i = 0;
          const iv = window.setInterval(() => {
            i += 2;
            setMsgs((m) => m.map((x) => (x.id === id ? { ...x, text: res.text.slice(0, i), done: i >= res.text.length } : x)));
            if (i >= res.text.length) {
              clearInterval(iv);
              setTyping(false);
            }
          }, 18);
          timers.current.push(iv);
        }, 800),
      );
    },
    [thinking, typing],
  );

  if (tourActive) return null;

  // Siempre por encima de la bottom-nav y de cualquier barra fija de la vista (checkout, ficha)
  const bottom = 'calc(var(--fixed-bottom-stack) + 12px + env(safe-area-inset-bottom))';

  return (
    <div data-no-print>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg transition hover:scale-105 lg:right-6"
          style={{ bottom, boxShadow: '0 8px 24px rgba(0,0,0,.18), 0 0 0 6px color-mix(in srgb, var(--accent) 18%, transparent)' }}
          aria-label={t('ai.open')}
          data-tour="ai-btn"
        >
          <Sparkles size={22} />
          <span className="absolute right-0.5 top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-ok" />
          </span>
        </button>
      )}
      {open && (
        <div
          className="modal-in fixed right-4 z-[65] flex h-[min(540px,64vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-panel border border-line bg-card shadow-md lg:right-6"
          style={{ bottom }}
          role="dialog"
          aria-label={t('ai.title')}
        >
          <div className="flex items-center gap-3 border-b border-line bg-navy-deep px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white">
              <Sparkles size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t('ai.title')}</div>
              <div className="flex items-center gap-1.5 text-xs text-[#86efac]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#86efac]" />
                {t('ai.online')}
              </div>
            </div>
            <button className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10" onClick={() => setOpen(false)} aria-label={t('common.close')}>
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
            {msgs.map((m) => (
              <div key={m.id} className={cn('flex flex-col', m.from === 'me' ? 'items-end' : 'items-start')}>
                <div className={cn('max-w-[85%] whitespace-pre-line rounded-[18px] px-3.5 py-2 text-[13.5px] leading-relaxed', m.from === 'me' ? 'rounded-br-[6px] bg-accent text-accent-fg' : 'rounded-bl-[6px] bg-subtle text-ink')}>{m.text}</div>
                {m.action && m.done && (
                  <button
                    onClick={() => {
                      useApp.getState().cancelarPreview();
                      if (m.action!.role && m.action!.role !== useApp.getState().role) useApp.getState().setRole(m.action!.role);
                      navigate(m.action!.path);
                      if (window.matchMedia('(max-width: 1023px)').matches) setOpen(false);
                    }}
                    className="fade-up mt-1.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 text-[12.5px] font-semibold text-accent"
                  >
                    {t(m.action.label)} <ArrowRight size={13} />
                  </button>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex">
                <div className="flex items-center gap-1 rounded-[18px] rounded-bl-[6px] bg-subtle px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            {msgs.length <= 1 && !thinking && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {SUGGESTIONS[role].map((s) => (
                  <button key={s[0]} onClick={() => ask(b(s))} className="min-h-[36px] rounded-full border border-accent/30 bg-accent-soft px-3 text-left text-[12.5px] font-medium text-accent hover:border-accent">
                    {b(s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {msgs.length > 1 && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2">
              {SUGGESTIONS[role].map((s) => (
                <button key={s[0]} onClick={() => ask(b(s))} className="min-h-[32px] shrink-0 rounded-full border border-line px-3 text-[12px] text-ink2 hover:border-accent hover:text-accent">
                  {b(s)}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5"
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('ai.placeholder')} className="input min-h-[42px] flex-1 rounded-full" />
            <button type="submit" disabled={!input.trim() || thinking || typing} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg disabled:opacity-40" aria-label={t('common.send')}>
              <ArrowUp size={18} />
            </button>
          </form>
          <div className="px-4 pb-2 text-center text-[10.5px] text-muted">{t('ai.footer')}</div>
        </div>
      )}
    </div>
  );
}
