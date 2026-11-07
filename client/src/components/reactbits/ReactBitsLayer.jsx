import { useEffect } from 'react';

/**
 * Small React Bits-inspired pointer layer.
 * Adds a restrained cursor-following highlight to selected surfaces.
 * It does not animate EEG traces or intercept user interactions.
 */
export default function ReactBitsLayer() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const selector = [
      '.public-feature-card', '.panel', '.page-panel', '.card', '.stat-card',
      '.kpi-card', '.explainability-card', '.schedule-card', '.note-card',
      '.eeg-workflow-panel', '.new-patient-panel'
    ].join(',');
    let active = null;
    const move = event => {
      if (event.pointerType === 'touch') return;
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      if (active && active !== target) {
        active.style.removeProperty('--rb-x');
        active.style.removeProperty('--rb-y');
      }
      active = target;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--rb-x', `${event.clientX - rect.left}px`);
      target.style.setProperty('--rb-y', `${event.clientY - rect.top}px`);
    };
    const clear = () => {
      if (active) {
        active.style.removeProperty('--rb-x');
        active.style.removeProperty('--rb-y');
        active = null;
      }
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', clear);
    window.addEventListener('blur', clear);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', clear);
      window.removeEventListener('blur', clear);
      clear();
    };
  }, []);
  return null;
}
