import { Fragment, useRef, useState } from 'react';
import { CheckCheck, ChevronLeft, Clock, MessageCircle, Phone, RotateCcw, Save, Send, Users, Video } from 'lucide-react';
import { useApp } from '@/store';
import { useT } from '@/i18n';
import { DEFAULT_PLANTILLAS, PLANTILLA_VARS, SAMPLE_VARS } from '@/data/content';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge, Switch } from '@/components/ui';
import type { Bi, Lang, PlantillaConfig, Timing } from '@/types';

type Draft = Pick<PlantillaConfig, 'texto' | 'timing' | 'destinatario'>;
const MAX = 1024;
const VAR_RE = /(\{\{\w+\}\})/g;
const IS_VAR = /^\{\{\w+\}\}$/;

const draftOf = (p: PlantillaConfig): Draft => ({ texto: [...p.texto] as Bi, timing: p.timing, destinatario: p.destinatario });
const same = (a: Draft, b: Draft) => a.texto[0] === b.texto[0] && a.texto[1] === b.texto[1] && a.timing === b.timing && a.destinatario === b.destinatario;

export function timingLabel(t: Timing, x: (es: string, en: string) => string) {
  return t === 'inmediato' ? x('Inmediato', 'Immediately') : x(`${t} antes del check-in`, `${t} before check-in`);
}

export function PlantillasTab() {
  const { x, e, lang } = useT();
  const plantillas = useApp((s) => s.plantillas);
  const updatePlantilla = useApp((s) => s.updatePlantilla);
  const resetPlantilla = useApp((s) => s.resetPlantilla);
  const toast = useApp((s) => s.toast);

  const [sel, setSel] = useState<PlantillaConfig['id']>('recordatorio');
  const [drafts, setDrafts] = useState<Partial<Record<PlantillaConfig['id'], Draft>>>({});
  const taRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const li = lang === 'es' ? 0 : 1;
  const stored = plantillas.find((p) => p.id === sel) ?? plantillas[0];
  const draft = drafts[sel] ?? draftOf(stored);
  const dirty = !same(draft, draftOf(stored));
  const isDirty = (p: PlantillaConfig) => !!drafts[p.id] && !same(drafts[p.id]!, draftOf(p));
  const text = draft.texto[li];
  const original = DEFAULT_PLANTILLAS.find((d) => d.id === sel)!;
  const isOriginal = same(draftOf(stored), draftOf(original));

  const patch = (p: Partial<Draft>) => setDrafts((d) => ({ ...d, [sel]: { ...draft, ...p } }));
  const setText = (v: string) => {
    const t: Bi = [...draft.texto] as Bi;
    t[li] = v.slice(0, MAX);
    patch({ texto: t });
  };

  const insertVar = (v: string) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + v + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const pos = start + v.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const save = () => {
    updatePlantilla(sel, { texto: draft.texto, timing: draft.timing, destinatario: draft.destinatario });
    setDrafts((d) => {
      const n = { ...d };
      delete n[sel];
      return n;
    });
    toast(x('Plantilla “{n}” guardada · se usa desde el próximo envío', 'Template “{n}” saved · used from the next message', { n: e('plantilla', sel) }));
  };

  const restore = () => {
    resetPlantilla(sel);
    setDrafts((d) => {
      const n = { ...d };
      delete n[sel];
      return n;
    });
    toast(x('Se restauró el texto original de “{n}”', 'Original text of “{n}” restored', { n: e('plantilla', sel) }), 'info');
  };

  const toggleActiva = (p: PlantillaConfig, v: boolean) => {
    updatePlantilla(p.id, { activa: v });
    toast(v ? x('“{n}” activada', '“{n}” enabled', { n: e('plantilla', p.id) }) : x('“{n}” pausada · no se enviará', '“{n}” paused · won’t be sent', { n: e('plantilla', p.id) }), v ? 'ok' : 'info');
  };

  const vars = SAMPLE_VARS(lang);
  const destLabel = (d: Draft['destinatario']) => (d === 'huesped' ? x('Huésped', 'Guest') : d === 'propietario' ? x('Propietario', 'Owner') : x('Huésped y propietario', 'Guest and owner'));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      {/* ---------- Lista ---------- */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" role="listbox" aria-label={x('Plantillas', 'Templates')}>
        {plantillas.map((p) => (
          <div
            key={p.id}
            role="option"
            aria-selected={sel === p.id}
            tabIndex={0}
            onClick={() => setSel(p.id)}
            onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && setSel(p.id)}
            className={cn(
              'card w-[220px] shrink-0 cursor-pointer p-3 transition lg:w-auto',
              sel === p.id ? 'border-accent ring-2 ring-accent/20' : 'hover:border-line-strong',
              !p.activa && 'opacity-70',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <MessageCircle size={14} className="shrink-0 text-ok" />
                  <span className="truncate text-sm font-semibold text-ink">{e('plantilla', p.id)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11.5px] text-ink2">
                  <Clock size={11} />
                  {timingLabel(p.timing, x)}
                </div>
              </div>
              <div onClick={(ev) => ev.stopPropagation()} className="-my-2.5">
                <Switch checked={p.activa} onChange={(v) => toggleActiva(p, v)} label={x('Activa', 'Active')} />
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
              {p.editada ? x('Editada {t}', 'Edited {t}', { t: fmtRelative(p.editada, lang) }) : x('Texto original', 'Original text')}
              {isDirty(p) && (
                <Badge tone="warn" className="py-0">
                  {x('sin guardar', 'unsaved')}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Editor ---------- */}
      <section className="card min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="section-title flex flex-wrap items-center gap-2">
              {e('plantilla', sel)}
              {dirty ? <Badge tone="warn" dot>{x('Cambios sin guardar', 'Unsaved changes')}</Badge> : <Badge tone="ok" dot>{x('Guardada', 'Saved')}</Badge>}
            </div>
            <div className="text-xs text-muted">{x('Editás la versión en español · cambiá el idioma arriba para editar la versión en inglés', 'Editing the English version · switch the language above to edit the Spanish one')}</div>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink2">
            {x('Activa', 'Active')}
            <Switch checked={stored.activa} onChange={(v) => toggleActiva(stored, v)} label={x('Activa', 'Active')} />
          </label>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pl-timing">
                {x('Cuándo se envía', 'When it’s sent')}
              </label>
              <select id="pl-timing" className="input" value={draft.timing} onChange={(ev) => patch({ timing: ev.target.value as Timing })}>
                <option value="inmediato">{x('Inmediato (al ocurrir el evento)', 'Immediately (on the event)')}</option>
                <option value="24h">{x('24 h antes del check-in', '24 h before check-in')}</option>
                <option value="48h">{x('48 h antes del check-in', '48 h before check-in')}</option>
                <option value="72h">{x('72 h antes del check-in', '72 h before check-in')}</option>
              </select>
              {sel !== 'recordatorio' && draft.timing !== 'inmediato' && <p className="mt-1 text-[11px] text-warn">{x('El tiempo previo al check-in aplica sobre todo a recordatorios.', 'Lead time before check-in mostly applies to reminders.')}</p>}
            </div>
            <div>
              <label className="label" htmlFor="pl-dest">
                {x('Destinatario', 'Recipient')}
              </label>
              <select id="pl-dest" className="input" value={draft.destinatario} onChange={(ev) => patch({ destinatario: ev.target.value as Draft['destinatario'] })}>
                <option value="huesped">{destLabel('huesped')}</option>
                <option value="propietario">{destLabel('propietario')}</option>
                <option value="ambos">{destLabel('ambos')}</option>
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="label mb-0" htmlFor="pl-text">
                {x('Mensaje', 'Message')} <span className="font-mono text-muted">({lang.toUpperCase()})</span>
              </label>
              <span className={cn('num text-[11px]', text.length > MAX * 0.9 ? 'text-warn' : 'text-muted')}>
                {text.length} / {MAX}
              </span>
            </div>
            <div className="relative rounded-ctl border border-line-strong bg-card transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
              <div ref={backRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2.5 text-sm leading-6 text-ink">
                {highlight(text)}
                {'\n '}
              </div>
              <textarea
                id="pl-text"
                ref={taRef}
                value={text}
                onChange={(ev) => setText(ev.target.value)}
                onScroll={(ev) => {
                  if (backRef.current) backRef.current.scrollTop = ev.currentTarget.scrollTop;
                }}
                rows={6}
                spellCheck={false}
                className="relative block min-h-[150px] w-full resize-y whitespace-pre-wrap break-words bg-transparent px-3 py-2.5 text-sm leading-6 text-transparent caret-[var(--text)] outline-none selection:bg-accent/25"
              />
            </div>
            <div className="mt-2.5">
              <div className="mb-1.5 text-[11px] font-medium text-ink2">{x('Tocá una variable para insertarla donde está el cursor:', 'Tap a variable to insert it at the cursor:')}</div>
              <div className="flex flex-wrap gap-1.5">
                {PLANTILLA_VARS.map((v) => (
                  <button key={v} type="button" onClick={() => insertVar(v)} className="inline-flex min-h-[34px] items-center rounded-full border border-accent/30 bg-accent-soft px-2.5 font-mono text-[11.5px] font-medium text-accent transition hover:border-accent" title={vars[v]}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:flex-wrap">
            <button className="btn-primary" onClick={save} disabled={!dirty}>
              <Save size={15} />
              {x('Guardar', 'Save')}
            </button>
            <button className="btn-secondary" onClick={restore} disabled={isOriginal && !dirty}>
              <RotateCcw size={15} />
              {x('Restaurar original', 'Restore original')}
            </button>
            <button className="btn-ghost sm:ml-auto" onClick={() => toast(x('Mensaje de prueba enviado a tu WhatsApp (+54 9 261 555-0100)', 'Test message sent to your WhatsApp (+54 9 261 555-0100)'), 'info')}>
              <Send size={15} />
              {x('Enviar prueba a mi WhatsApp', 'Send test to my WhatsApp')}
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Vista previa ---------- */}
      <div className="min-w-0 lg:col-start-2 2xl:col-start-auto">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{x('Vista previa en vivo', 'Live preview')}</span>
          <span className="text-[11px] text-muted">{destLabel(draft.destinatario)}</span>
        </div>
        <PhonePreview text={text} lang={lang} vars={vars} timing={timingLabel(draft.timing, x)} />
      </div>
    </div>
  );
}

function highlight(text: string) {
  return text.split(VAR_RE).map((part, i) =>
    IS_VAR.test(part) ? (
      <mark key={i} className="rounded-[3px] bg-accent-soft text-accent shadow-[0_0_0_1px_var(--accent-ring)]">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function PhonePreview({ text, lang, vars, timing }: { text: string; lang: Lang; vars: Record<string, string>; timing: string }) {
  const { x } = useT();
  const parts = text.split(VAR_RE);
  const time = new Date().toLocaleTimeString(lang === 'es' ? 'es-AR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[34px] border border-line-strong bg-card p-2 shadow-md">
      <div className="overflow-hidden rounded-[27px] border border-line">
        <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white dark:bg-[#1f2c34]">
          <ChevronLeft size={18} className="shrink-0 opacity-80" />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e2601a] text-[11px] font-bold">FD</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">Full Day</div>
            <div className="truncate text-[10.5px] opacity-75">{x('Cuenta de empresa', 'Business account')}</div>
          </div>
          <Video size={17} className="shrink-0 opacity-80" />
          <Phone size={16} className="shrink-0 opacity-80" />
        </div>
        <div className="min-h-[300px] bg-[#efeae2] px-3 py-4 dark:bg-[#0b141a]">
          <div className="mx-auto mb-3 w-fit rounded-md bg-white/80 px-2 py-0.5 text-[10.5px] text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">{x('HOY', 'TODAY')}</div>
          <div className="mx-auto mb-3 w-fit max-w-[90%] rounded-md bg-[#fff5c4] px-2 py-1 text-center text-[10.5px] text-[#54656f] dark:bg-[#182229] dark:text-[#ffd279]">
            <Users size={10} className="mr-1 inline" />
            {x('Envío automático · {t}', 'Automatic send · {t}', { t: timing })}
          </div>
          <div className="relative ml-auto w-fit max-w-[88%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 pb-1.5 pt-1.5 text-[13.5px] leading-[1.4] text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
            <p className="whitespace-pre-wrap break-words">
              {text.trim() ? (
                parts.map((p, i) => (IS_VAR.test(p) ? <strong key={i} className="font-semibold">{vars[p] ?? p}</strong> : <Fragment key={i}>{p}</Fragment>))
              ) : (
                <span className="italic opacity-60">{x('(mensaje vacío)', '(empty message)')}</span>
              )}
            </p>
            <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-[#667781] dark:text-[#8696a0]">
              {time}
              <CheckCheck size={14} className="text-[#53bdeb]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
