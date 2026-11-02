import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

// shadcn/ui Alert composition, adapted to warning and neutral semantic tokens.
export function Alert({ className, variant = 'default', ...props }: ComponentProps<'div'> & { variant?: 'default' | 'warning' }) {
  return <div role="status" className={cn('rounded-xl border p-4 text-sm leading-relaxed', variant === 'warning' ? 'border-warning-border bg-warning text-warning-foreground' : 'border-border bg-secondary text-secondary-foreground', className)} {...props} />;
}
export function AlertTitle({ className, ...props }: ComponentProps<'h4'>) {
  return <h4 className={cn('mb-1 font-semibold', className)} {...props} />;
}
export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('text-sm leading-relaxed', className)} {...props} />;
}
