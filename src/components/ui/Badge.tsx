import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'ok'
  | 'warn'
  | 'bad'
  | 'disc'
  | 'pri'
  | 'info';

export function Badge({
  children,
  variant = 'pri',
  withDot,
  className = '',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  withDot?: boolean;
  className?: string;
}) {
  let styleClass = '';
  let showDot = withDot;

  switch (variant) {
    case 'default':
      styleClass = 'bg-[var(--pri)] text-[var(--pri-ink)] font-bold';
      if (showDot === undefined) showDot = false;
      break;
    case 'secondary':
      styleClass = 'bg-[var(--surface2)] text-[var(--ink)] border border-[var(--line)] font-medium';
      if (showDot === undefined) showDot = false;
      break;
    case 'outline':
      styleClass = 'border border-[var(--line)] text-[var(--ink2)] bg-transparent';
      if (showDot === undefined) showDot = false;
      break;
    case 'destructive':
    case 'bad':
      styleClass = 'b-bad';
      if (showDot === undefined) showDot = true;
      break;
    case 'ok':
      styleClass = 'b-ok';
      if (showDot === undefined) showDot = true;
      break;
    case 'warn':
      styleClass = 'b-warn';
      if (showDot === undefined) showDot = true;
      break;
    case 'disc':
      styleClass = 'b-disc';
      if (showDot === undefined) showDot = true;
      break;
    case 'pri':
      styleClass = 'b-pri';
      if (showDot === undefined) showDot = true;
      break;
    case 'info':
      styleClass = 'b-info';
      if (showDot === undefined) showDot = true;
      break;
    default:
      styleClass = 'b-pri';
      if (showDot === undefined) showDot = true;
  }

  return (
    <span className={`badge ${styleClass} ${className}`}>
      {showDot && <i aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
