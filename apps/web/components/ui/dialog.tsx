'use client';

// Adapted from shadcn/ui Radix Dialog (MIT). See docs/licenses/shadcn-ui-MIT.txt.
import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import styles from './dialog.module.css';

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

export function DialogContent({ children, className, themeClassName, closeLabel = 'Close simulator', ...props }: ComponentProps<typeof Primitive.Content> & { themeClassName?: string | undefined; closeLabel?: string }) {
  return <Primitive.Portal>
    <Primitive.Overlay className={styles.overlay} />
    <Primitive.Content className={cn(styles.content, themeClassName, className)} {...props}>
      {children}
      <Primitive.Close className={styles.close} aria-label={closeLabel}><X aria-hidden="true" /></Primitive.Close>
    </Primitive.Content>
  </Primitive.Portal>;
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 pr-10', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn('text-2xl font-semibold tracking-tight text-foreground', className)} {...props} />;
}
export function DialogDescription({ className, ...props }: ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}
