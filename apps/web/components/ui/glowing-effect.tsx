'use client';

// Pointer-angle algorithm adapted from Aceternity UI Glowing Effect by Manu Arora.
// Source: https://ui.aceternity.com/registry/glowing-effect.json
import { useEffect, useRef } from 'react';
import { animate } from 'motion/react';
import styles from './glowing-effect.module.css';

export function GlowingEffect() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const card = element?.parentElement;
    if (!element || !card) return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    let animation: ReturnType<typeof animate> | undefined;
    const reset = () => {
      cancelAnimationFrame(frame);
      animation?.stop();
      element.dataset.active = 'false';
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        if (Math.hypot(event.clientX - centerX, event.clientY - centerY) < Math.min(rect.width, rect.height) * .2) { reset(); return; }
        element.dataset.active = 'true';
        const current = parseFloat(element.style.getPropertyValue('--glow-angle')) || 0;
        const target = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI + 90;
        const delta = ((target - current + 540) % 360) - 180;
        animation?.stop();
        animation = animate(current, current + delta, {
          duration: .3,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: value => element.style.setProperty('--glow-angle', String(value)),
        });
      });
    };
    card.addEventListener('pointermove', move, { passive: true });
    card.addEventListener('pointerleave', reset);
    window.addEventListener('scroll', reset, { passive: true });
    media.addEventListener('change', reset);
    return () => {
      reset();
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', reset);
      window.removeEventListener('scroll', reset);
      media.removeEventListener('change', reset);
    };
  }, []);
  return <div ref={ref} className={styles.glow} aria-hidden="true" data-glowing-effect data-active="false" />;
}
