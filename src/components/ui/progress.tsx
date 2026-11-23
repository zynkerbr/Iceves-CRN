import React from 'react';

export function Progress({
  value = 0,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number }) {
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface2)] ${className}`}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-gradient-to-r from-[var(--pri)] to-[var(--ok)] transition-all duration-500 ease-out"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}

export default Progress;
