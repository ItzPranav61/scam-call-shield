// Adapted from Magic UI Shine Border (MIT). See docs/licenses/magic-ui-MIT.txt.
import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import styles from './hero-effects.module.css';

export function ShineBorder({ className, borderWidth = 1.5, duration = 4, shineColor = ['#a9c49a', '#f7f6f0', '#a9c49a'] }: {
  className?: string | undefined;
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
}) {
  return <span aria-hidden="true" data-shine-border className={cn(styles.shine, className)} style={{
    '--border-width': `${borderWidth}px`,
    '--duration': `${duration}s`,
    backgroundImage: `radial-gradient(transparent,transparent,${Array.isArray(shineColor) ? shineColor.join(',') : shineColor},transparent,transparent)`,
  } as CSSProperties} />;
}
