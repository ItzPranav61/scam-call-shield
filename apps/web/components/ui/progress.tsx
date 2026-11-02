import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import styles from './progress.module.css';

type ProgressProps = Omit<ComponentProps<'progress'>, 'value' | 'max'> & { value: number; max?: number };

/** Native accessible progress; no extra runtime dependency. */
export function Progress({ value, max = 100, className, ...props }: ProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(0, value), safeMax) : 0;
  return <progress className={cn(styles.progress, className)} max={safeMax} value={safeValue} {...props} />;
}
