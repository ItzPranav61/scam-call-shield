'use client';

// Adapted from Origin UI (MIT). See docs/licenses/origin-ui-MIT.txt.
import * as Primitive from '@radix-ui/react-accordion';
import type { ComponentProps } from 'react';
import styles from './accordion.module.css';

export const Accordion = Primitive.Root;

export function AccordionItem({ className = '', ...props }: ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item className={`${styles.item} ${className}`} {...props} />;
}

export function AccordionTrigger({ children, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Header className={styles.heading}>
    <Primitive.Trigger className={styles.trigger} {...props}>{children}<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></Primitive.Trigger>
  </Primitive.Header>;
}

export function AccordionContent({ children, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content className={styles.panel} {...props}><div className={styles.content}>{children}</div></Primitive.Content>;
}
