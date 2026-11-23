import React, { useState, useEffect } from 'react';

export function useCountUp(to: number, ms = 900, dec = 0) {
  const [v, setV] = useState(0);

  useEffect(() => {
    if (
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setV(to);
      return;
    }
    let t0: number | null = null;
    let raf = 0;
    const f = (t: number) => {
      t0 ??= t;
      const p = Math.min((t - t0) / ms, 1);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);

  return dec === 0
    ? Math.round(v).toString()
    : v.toFixed(dec).replace('.', ',');
}

export function ScoreCount({
  value,
  dec = 0,
  unit = '',
  className = '',
}: {
  value: number;
  dec?: number;
  unit?: string;
  className?: string;
}) {
  const formatted = useCountUp(value, 900, dec);

  return (
    <span className={`tabular-nums ${className}`}>
      {formatted}
      {unit ? <span className="text-base font-semibold ml-1">{unit}</span> : null}
    </span>
  );
}
