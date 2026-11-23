import React, { useState } from 'react';

export function Avatar({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-[var(--surface2)] border border-[var(--line)] ${className}`}
    >
      {children}
    </div>
  );
}

export function AvatarImage({
  src,
  alt = '',
  className = '',
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={`aspect-square h-full w-full object-cover ${className}`}
    />
  );
}

export function AvatarFallback({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`flex h-full w-full items-center justify-center font-bold text-xs text-[var(--ink)] bg-[var(--surface2)] ${className}`}
    >
      {children}
    </span>
  );
}
