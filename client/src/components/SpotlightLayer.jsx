import { useEffect } from 'react';

/**
 * Lightweight SpotlightCard-style pointer treatment inspired by React Bits.
 * Uses CSS custom properties only; it never intercepts clicks or touches.
 */
export default function SpotlightLayer() {
  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reducedMotion?.matches) return undefined;

    const selector = '.pub-card, .pub-visual, .card, .panel, .stat-card, .kpi-card, .explainability-card, .schedule-card, .note-card, .new-patient-panel';
    let active = null;

    const clear = () => {
      if (!active) return;
      active.style.removeProperty('--spot-x');
      active.style.removeProperty('--spot-y');
      active = null;
    };

    const move = (event) => {
      if (event.pointerType === 'touch') return;
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      if (active && active !== target) clear();
      active = target;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      target.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    };

    document.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', clear);
    document.addEventListener('pointerleave', clear);
    return () => {
      document.removeEventListener('pointermove', move);
      window.removeEventListener('blur', clear);
      document.removeEventListener('pointerleave', clear);
      clear();
    };
  }, []);

  return null;
}
