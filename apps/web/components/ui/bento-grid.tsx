// Adapted from Magic UI Bento Grid (MIT); semantic articles, visible actions,
// variable row heights and CSS Modules replace the hover-only source treatment.
// See docs/licenses/magic-ui-MIT.txt.
import type { ComponentProps } from 'react';
import styles from './bento-grid.module.css';

export function BentoGrid({ className = '', children, ...props }: ComponentProps<'div'>) {
  return <div className={`${styles.grid} ${className}`} {...props}>{children}</div>;
}

export function BentoCard({ className = '', children, ...props }: ComponentProps<'article'>) {
  return <article className={`${styles.card} ${className}`} {...props}>{children}</article>;
}
