import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Inbox, RefreshCw, X } from 'lucide-react';

/* ---------- Primitives ---------- */
export const Badge = ({ tone = '', icon: Icon, dot = false, children }) => (
  <span className={`badge${tone ? ` is-${tone}` : ''}`}>
    {dot && <i className="dot" />}
    {Icon && <Icon size={12} aria-hidden="true" />}
    {children}
  </span>
);

export const Card = ({ className = '', children, ...rest }) => (
  <section className={`card ${className}`.trim()} {...rest}>{children}</section>
);

export const CardHead = ({ icon: Icon, tone = '', title, sub, subtitle, actions, right }) => {
  const subText = sub ?? subtitle;
  const rightContent = actions ?? right;
  return (
    <div className="card-head">
      <div className="card-title">
        {Icon && <span className={`card-icon${tone ? ` is-${tone}` : ''}`}><Icon size={18} aria-hidden="true" /></span>}
        <div>
          <h3>{title}</h3>
          {subText && <p className="card-sub">{subText}</p>}
        </div>
      </div>
      {rightContent && <div className="row">{rightContent}</div>}
    </div>
  );
};

export const MetricCard = ({ icon: Icon, tone = '', label, value, note, sub, isText = false, loading = false }) => {
  const noteText = note ?? sub;
  return (
    <Card className="metric">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {Icon && <span className={`card-icon${tone ? ` is-${tone}` : ''}`}><Icon size={17} aria-hidden="true" /></span>}
      </div>
      {loading ? <Skeleton h={32} w="55%" /> : <div className={`metric-value${isText ? ' is-text' : ''}`}>{value}</div>}
      {noteText && <div className="metric-note">{noteText}</div>}
    </Card>
  );
};

export const PageHeader = ({ eyebrow, title, description, subtitle, actions }) => {
  const descText = description ?? subtitle;
  return (
    <div className="page-head">
      <div>
        {eyebrow && <p className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {descText && <p className="page-desc">{descText}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
};

export const Skeleton = ({ h = 14, w = '100%', className = '' }) => (
  <div className={`skel ${className}`.trim()} style={{ height: h, width: w }} aria-hidden="true" />
);

export const SkeletonCards = ({ count = 4, h = 112 }) => (
  <div className="grid metrics" aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => <Skeleton key={i} h={h} className="card" />)}
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, body, children, action }) => (
  <div className="empty">
    <span className="empty-icon"><Icon size={22} aria-hidden="true" /></span>
    <h4>{title}</h4>
    {(body || children) && <p>{body || children}</p>}
    {action}
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', message, onRetry }) => (
  <div className="empty is-error" role="alert">
    <span className="empty-icon"><AlertTriangle size={22} aria-hidden="true" /></span>
    <h4>{title}</h4>
    {message && <p>{message}</p>}
    {onRetry && <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}><RefreshCw size={14} /> Try again</button>}
  </div>
);

export const Alert = ({ tone = 'info', icon: Icon, title, children }) => {
  const Glyph = Icon || (tone === 'danger' || tone === 'warning' ? AlertTriangle : tone === 'success' ? CheckCircle2 : Info);
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'note'}>
      <Glyph size={16} aria-hidden="true" />
      <div>
        {title && <b style={{ display: 'block', marginBottom: 2 }}>{title}</b>}
        {children}
      </div>
    </div>
  );
};

export const ResearchNotice = () => (
  <Alert tone="warning">
    <b>Research use only.</b> Model outputs are experimental research predictions, not medical diagnoses. They must be reviewed by a qualified clinician and must not guide treatment or emergency decisions.
  </Alert>
);

export const Tabs = ({ tabs, items, value, onChange, label }) => {
  const list = tabs || items || [];
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {list.map((t) => {
        const key = t.id ?? t.value;
        return (
          <button key={key} type="button" role="tab" className="tab" aria-selected={value === key} onClick={() => onChange(key)}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

export const Field = ({ label, hint, children, className = '' }) => (
  <label className={`field ${className}`.trim()}>
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

export const Meter = ({ value = 0, tone = '', label }) => {
  const pct = value > 1.001 ? value : value * 100;
  return (
    <div className="meter" role="img" aria-label={label}>
      <div className={`meter-fill${tone ? ` is-${tone}` : ''}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
};

/* ---------- Modal with focus management ---------- */
const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])';

export function Modal({ open = true, title, subtitle, onClose, children, footer, large = false, wide = false, labelledBy }) {
  const ref = useRef(null);
  const titleId = labelledBy || 'modal-title';
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const node = ref.current;
    (node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE))?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current?.(); }
      if (event.key === 'Tab' && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`modal${large || wide ? ' is-lg' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', tone = 'primary', busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" data-autofocus className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </>
      )}
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
const ToastContext = createContext({ push: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const push = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((list) => [...list.slice(-3), { id, message, tone }]);
    timers.current.set(id, setTimeout(() => dismiss(id), tone === 'danger' ? 9000 : 5000));
  }, [dismiss]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const api = useMemo(() => ({
    push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'danger'),
    info: (m) => push(m, 'info')
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => {
          const Glyph = t.tone === 'danger' ? AlertTriangle : t.tone === 'success' ? CheckCircle2 : Info;
          return (
            <div key={t.id} className={`toast is-${t.tone}`} role={t.tone === 'danger' ? 'alert' : 'status'}>
              <Glyph size={17} aria-hidden="true" />
              <p>{t.message}</p>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => dismiss(t.id)} aria-label="Dismiss notification"><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Click-outside + Escape hook for dropdowns ---------- */
export function useDismiss(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  return ref;
}
