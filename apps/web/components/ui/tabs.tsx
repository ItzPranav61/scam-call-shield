'use client';

// Adapted from Origin UI (MIT). See docs/licenses/origin-ui-MIT.txt.
import * as Primitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';
import styles from './tabs.module.css';

export const Tabs = Primitive.Root;
export const TabsContent = Primitive.Content;

export function TabsList({ className = '', ...props }: ComponentProps<typeof Primitive.List>) {
  return <Primitive.List className={`${styles.list} ${className}`} {...props} />;
}

export function TabsTrigger({ children, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger className={styles.trigger} {...props}>{children}</Primitive.Trigger>;
}
