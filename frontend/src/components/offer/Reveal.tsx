'use client';

import { useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from 'react';

export type RevealEffect = 'up' | 'fade' | 'scale' | 'left' | 'right' | 'mask' | 'line';

type RevealTag = 'div' | 'figure' | 'a' | 'section' | 'span' | 'li' | 'p';

type RevealProps = Omit<HTMLAttributes<HTMLElement>, 'className' | 'style' | 'children'> & {
  children?: ReactNode;
  effect?: RevealEffect;
  delay?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  as?: RevealTag;
  href?: string;
  once?: boolean;
  threshold?: number;
};

/**
 * Scroll-triggered reveal. Adds `is-in` when the element enters the viewport.
 * All motion lives in CSS (`.rv`) so it is cheap, print-safe and respects
 * prefers-reduced-motion.
 */
export default function Reveal({
  children,
  effect = 'up',
  delay = 0,
  duration,
  className = '',
  style,
  as = 'div',
  once = true,
  threshold = 0.15,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-in');
            if (once) io.unobserve(el);
          } else if (!once) {
            el.classList.remove('is-in');
          }
        });
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  const vars = {
    ...style,
    '--rv-delay': `${delay}ms`,
    ...(duration ? { '--rv-duration': `${duration}ms` } : {}),
  } as CSSProperties;

  const Tag = as as 'div';

  return (
    <Tag ref={ref as Ref<HTMLDivElement>} className={`rv rv-${effect} ${className}`} style={vars} {...rest}>
      {children}
    </Tag>
  );
}
