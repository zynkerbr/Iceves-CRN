import React from 'react';

export function ProgressBar({
  value,
  max = 100,
  className = '',
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={`bar ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div style={{ width: `${percentage}%` }} />
    </div>
  );
}
