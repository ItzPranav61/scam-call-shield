'use client';

import { useRef, type ReactNode } from 'react';
import { AnimatedBeam } from './ui/animated-beam';
import styles from './how-it-works.module.css';

export function ProcessFlow({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLElement>(null);
  const second = useRef<HTMLElement>(null);
  const third = useRef<HTMLElement>(null);
  const fourth = useRef<HTMLElement>(null);
  const refs = [first, second, third, fourth];
  return <div className={styles.flow} ref={node => {
    containerRef.current = node;
    const nodes = node?.querySelectorAll<HTMLElement>('[data-flow-node]');
    refs.forEach((ref, index) => { ref.current = nodes?.[index] ?? null; });
  }}>
    {children}
    {[[first, second], [second, third], [third, fourth]].map(([from, to], index) => from && to && <AnimatedBeam key={index} containerRef={containerRef} fromRef={from} toRef={to} className={styles.beam ?? ""} pathColor="var(--line)" pathOpacity={1} gradientStartColor="var(--focus-ring)" gradientStopColor="var(--tone-22d3ee)" pathWidth={2} duration={1.1} delay={index * 1.1} repeat={0} />)}
  </div>;
}
