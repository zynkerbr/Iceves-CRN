import React, { useEffect, useRef } from 'react';

export function BlurText({
  text,
  delay = 110,
  as: Tag = 'h2',
  className = '',
}: {
  text: string;
  delay?: number;
  as?: any;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const rm =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (rm || !ref.current) return;
    const spans = ref.current.querySelectorAll('span');
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        spans.forEach((s, i) =>
          s.animate(
            [
              { filter: 'blur(10px)', opacity: 0, transform: 'translateY(-30px)' },
              { filter: 'blur(5px)', opacity: 0.5, transform: 'translateY(5px)', offset: 0.5 },
              { filter: 'blur(0)', opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 600, delay: i * delay, fill: 'both', easing: 'ease-out' }
          )
        );
      },
      { threshold: 0.1 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [text, rm, delay]);

  return (
    <Tag
      ref={ref}
      aria-label={text}
      className={`inline-flex flex-wrap ${className}`}
      style={{ display: 'flex', flexWrap: 'wrap' }}
    >
      {text.split(' ').map((w, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            opacity: rm ? 1 : 0,
            whiteSpace: 'pre',
          }}
        >
          {w}&nbsp;
        </span>
      ))}
    </Tag>
  );
}
