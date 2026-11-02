'use client';

// Static SVG variant of Magic UI Dot Pattern (MIT). No random glow or resize work.
import { useId } from 'react';
import { cn } from '../../lib/utils';
import styles from './hero-effects.module.css';

export function DotPattern({ className, spacing = 24, radius = .8 }: {
  className?: string | undefined;
  spacing?: number;
  radius?: number;
}) {
  const id = useId();
  return <svg aria-hidden="true" focusable="false" className={cn(styles.dots, className)} data-dot-pattern>
    <defs><pattern id={id} width={spacing} height={spacing} patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r={radius} fill="currentColor" /></pattern></defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>;
}
