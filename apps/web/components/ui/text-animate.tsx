// Adapted from Magic UI's staggered blurInUp text treatment (MIT).
// See docs/licenses/magic-ui-MIT.txt. CSS keeps the text visible without JS.
import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import styles from './hero-effects.module.css';

export function TextAnimate({ children, lastWordClassName }: {
  children: string;
  lastWordClassName?: string | undefined;
}) {
  let wordIndex = 0;
  const lines = children.split('\n');

  return <span aria-hidden="true" data-text-animate>
    {lines.map((line, lineIndex) => <span key={line}>
      {line.split(' ').map((word, index, words) => {
        const isLast = lineIndex === lines.length - 1 && index === words.length - 1;
        const delay = wordIndex++ * 70;
        return <span key={`${index}-${word}`}>
          <span className={cn(styles.word, isLast && lastWordClassName)} style={{ '--word-delay': `${delay}ms` } as CSSProperties} data-animated-word>{word}</span>
          {index < words.length - 1 ? ' ' : null}
        </span>;
      })}
      {lineIndex < lines.length - 1 ? <br /> : null}
    </span>)}
  </span>;
}
