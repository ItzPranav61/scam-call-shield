'use client';

// Adapted from the Aceternity UI source supplied by the user.
import { cn } from '../../lib/utils';
import {
  createContext, useState, useContext, useRef, useEffect,
  type ReactNode, type Dispatch, type SetStateAction, type MouseEvent,
  type ElementType, type ComponentPropsWithoutRef,
} from 'react';

const MouseEnterContext = createContext<
  [boolean, Dispatch<SetStateAction<boolean>>] | undefined
>(undefined);

function motionAllowed() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CardContainer({ children, className, containerClassName }: {
  children?: ReactNode;
  className?: string | undefined;
  containerClassName?: string | undefined;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<DOMRect | null>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  useEffect(() => {
    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(hover: hover) and (pointer: fine)'),
    ];
    const reset = () => {
      setIsMouseEntered(false);
      if (containerRef.current) containerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
    };
    queries.forEach(query => query.addEventListener('change', reset));
    return () => queries.forEach(query => query.removeEventListener('change', reset));
  }, []);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!containerRef.current || !boundsRef.current || !motionAllowed()) return;
    const { left, top, width, height } = boundsRef.current;
    const x = Math.max(-8, Math.min(8, (event.clientX - left - width / 2) / 25));
    const y = Math.max(-8, Math.min(8, (event.clientY - top - height / 2) / 25));
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  }

  function handleMouseEnter() {
    if (!motionAllowed()) return;
    boundsRef.current = containerRef.current?.getBoundingClientRect() ?? null;
    setIsMouseEntered(true);
  }

  function handleMouseLeave() {
    setIsMouseEntered(false);
    boundsRef.current = null;
    if (containerRef.current) containerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
  }

  return <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
    <div className={cn('py-20 flex items-center justify-center', containerClassName)} style={{ perspective: '1000px' }}>
      <div ref={containerRef} onMouseEnter={handleMouseEnter} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
        className={cn('flex items-center justify-center relative transition-all duration-200 ease-linear motion-reduce:transition-none', className)}
        style={{ transformStyle: 'preserve-3d' }} data-card-tilt>
        {children}
      </div>
    </div>
  </MouseEnterContext.Provider>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('h-96 w-96 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]', className)}>{children}</div>;
}

type CardItemProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string | undefined;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function CardItem<T extends ElementType = 'div'>({
  as, children, className, translateX = 0, translateY = 0, translateZ = 0,
  rotateX = 0, rotateY = 0, rotateZ = 0, ...rest
}: CardItemProps<T>) {
  const Tag: ElementType = as ?? 'div';
  const ref = useRef<HTMLElement>(null);
  const [isMouseEntered] = useMouseEnter();

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.transform = isMouseEntered && motionAllowed()
      ? `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
      : 'translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
  }, [isMouseEntered, translateX, translateY, translateZ, rotateX, rotateY, rotateZ]);

  return <Tag ref={ref} className={cn('w-fit transition duration-200 ease-linear motion-reduce:transition-none', className)} {...rest}>{children}</Tag>;
}

export function useMouseEnter() {
  const context = useContext(MouseEnterContext);
  if (context === undefined) throw new Error('useMouseEnter must be used within a CardContainer');
  return context;
}
