'use client';

// shadcn/ui Sheet composition using the already-installed Radix Dialog primitive.
import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import styles from './sheet.module.css';

export const Sheet = Primitive.Root;
export const SheetTrigger = Primitive.Trigger;
export const SheetClose = Primitive.Close;
export const SheetTitle = Primitive.Title;
export const SheetDescription = Primitive.Description;

export function SheetContent({ children, className, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Overlay className={styles.overlay} /><Primitive.Content className={cn(styles.content, className)} {...props}>
    {children}<Primitive.Close className={styles.close} aria-label="Close menu"><X aria-hidden="true" /></Primitive.Close>
  </Primitive.Content></Primitive.Portal>;
}
