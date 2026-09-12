import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

type Props = { value: Date | null; onChange: (value: Date | null) => void };
const control: CSSProperties = {
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', fontSize: 14, color: '#111827', background: '#fff',
  border: '1px solid #d1d5db', borderRadius: 12, padding: '8px 10px',
  minHeight: 40, cursor: 'pointer', boxSizing: 'border-box',
};
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export default function AppointmentPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => value ?? new Date());
  const [month, setMonth] = useState(() => midnight(value ?? new Date()));
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 480 });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      const panel = popup.current;
      if (!anchor || !panel) return;
      const edge = 12, gap = 8;
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const bottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const right = viewportLeft + (viewport?.width ?? window.innerWidth);
      const below = Math.max(0, bottom - anchor.bottom - edge - gap);
      const above = Math.max(0, anchor.top - viewportTop - edge - gap);
      const naturalHeight = panel.scrollHeight + 2;
      const useBelow = below >= naturalHeight || below >= above;
      const available = Math.max(0, useBelow ? below : above);
      const height = Math.min(naturalHeight, available);
      const next = {
        left: Math.max(viewportLeft + edge, Math.min(anchor.left, right - panel.offsetWidth - edge)),
        top: useBelow ? anchor.bottom + gap : anchor.top - gap - height,
        maxHeight: available,
      };
      setPosition(old => old.left === next.left && old.top === next.top && old.maxHeight === next.maxHeight ? old : next);
    };
    popup.current?.showPopover();
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
    };
  }, [open, month, error]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!popup.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    popup.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const today = midnight(new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const chooseDay = (day: Date) => {
    const next = new Date(day);
    next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    setDraft(next); setMonth(midnight(next)); setError('');
  };
  const setTime = (hours: number, minutes: number) => {
    const next = new Date(draft); next.setHours(hours, minutes, 0, 0);
    setDraft(next); setError('');
  };
  return <div style={{ width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', color: '#111827' }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-haspopup="dialog"
      style={{ ...control, minHeight: 50, fontSize: 16, width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 8 }}
      onClick={() => {
        if (open) { close(); return; }
        const next = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
        next.setSeconds(0, 0); setDraft(next); setMonth(midnight(next)); setError(''); setOpen(true);
      }}>
      <span>{value ? value.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Choose date and time'}</span>
      <span aria-hidden="true">{open ? '▴' : '▾'}</span>
    </button>
    {open ? <div ref={popup} popover="manual" role="dialog" aria-modal={false} aria-label="Choose appointment date and time"
      style={{ position: 'fixed', inset: 'auto', zIndex: 10000, left: position.left, top: position.top,
        width: 360, maxWidth: 'calc(100vw - 24px)', maxHeight: position.maxHeight,
        overflowY: 'auto', boxSizing: 'border-box', margin: 0, padding: 16,
        border: '1px solid #e5e7eb', borderRadius: 16, background: '#f9fafb', color: '#111827',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
      <strong style={{ display: 'block', marginBottom: 12 }}>Date and time</strong>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[0, 1].map(offset => <button type="button" key={offset} style={control}
          onClick={() => { const d = new Date(today); d.setDate(d.getDate() + offset); chooseDay(d); }}>
          {offset ? 'Tomorrow' : 'Today'}
        </button>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" aria-label="Previous month" style={control}
          disabled={first <= new Date(today.getFullYear(), today.getMonth(), 1)}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <strong aria-live="polite">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" aria-label="Next month" style={control}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginTop: 12 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <span key={'label'+i} aria-hidden="true" style={{ textAlign: 'center', padding: '8px 0', color: '#6b7280', fontSize: 13 }}>{day}</span>)}
        {Array.from({ length: first.getDay() }, (_, i) => <span key={'blank'+i} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
          const selected = midnight(draft).getTime() === d.getTime();
          const past = d < today;
          return <button key={i} type="button" disabled={past} aria-pressed={selected}
            aria-label={d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            onClick={() => chooseDay(d)}
            style={{ ...control, padding: '6px 0', minHeight: 36, borderColor: selected ? '#111827' : 'transparent',
              background: selected ? '#111827' : '#fff', color: selected ? '#fff' : past ? '#9ca3af' : '#111827', cursor: past ? 'default' : 'pointer' }}>{i + 1}</button>;
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <span>Time</span>
        <select aria-label="Hour" style={control} value={draft.getHours() % 12 || 12}
          onChange={e => setTime(Number(e.target.value) % 12 + (draft.getHours() >= 12 ? 12 : 0), draft.getMinutes())}>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </select>
        <span>:</span>
        <select aria-label="Minute" style={control} value={draft.getMinutes()}
          onChange={e => setTime(draft.getHours(), Number(e.target.value))}>
          {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
        </select>
        <select aria-label="AM or PM" style={control} value={draft.getHours() >= 12 ? 'PM' : 'AM'}
          onChange={e => setTime(draft.getHours() % 12 + (e.target.value === 'PM' ? 12 : 0), draft.getMinutes())}>
          <option>AM</option><option>PM</option>
        </select>
      </div>
      {error ? <p role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>{error}</p> : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" style={control} onClick={() => { onChange(null); close(); }}>Clear</button>
        <button type="button" style={control} onClick={close}>Cancel</button>
        <button type="button" style={{ ...control, background: '#111827', color: '#fff', borderColor: '#111827' }}
          onClick={() => {
            if (draft.getTime() <= Date.now()) { setError('Choose a future date and time.'); return; }
            onChange(new Date(draft)); close();
          }}>Done</button>
      </div>
    </div> : null}
  </div>;
}
