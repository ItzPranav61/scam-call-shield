'use client';

// Adapted from the user-supplied Aceternity Parallax Scroll example.
import { Children, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { cn } from '../../lib/utils';

const mediaQuery = '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

function subscribe(callback: () => void) {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(mediaQuery).matches;
}

function getServerSnapshot() {
  return false;
}

export function ParallaxScroll({ children, className, itemClassName }: {
  children: ReactNode;
  className?: string | undefined;
  itemClassName?: string | undefined;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { scrollYProgress } = useScroll({ target: gridRef, offset: ['start end', 'end start'] });
  const translateFirst = useTransform(scrollYProgress, [0, 1], [0, -24]);
  const translateSecond = useTransform(scrollYProgress, [0, 1], [0, 24]);
  const translateThird = useTransform(scrollYProgress, [0, 1], [0, -24]);
  const offsets = [translateFirst, translateSecond, translateThird];

  return <div ref={gridRef} className={cn('grid w-full items-start gap-6', className)} data-parallax-scroll>
    {Children.toArray(children).map((child, index) => <motion.div
      key={index}
      className={cn('min-w-0', itemClassName)}
      style={{ y: enabled ? (offsets[index % offsets.length] ?? 0) : 0 }}
      data-parallax-item
    >{child}</motion.div>)}
  </div>;
}
