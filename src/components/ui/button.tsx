import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
    let base =
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

    let variantClasses = 'bg-[var(--pri)] text-[var(--pri-ink)] hover:shadow-xs active:scale-98';

    switch (variant) {
      case 'destructive':
        variantClasses = 'bg-[var(--bad)] text-white hover:bg-[var(--bad)]/90';
        break;
      case 'outline':
        variantClasses =
          'border border-[var(--line)] bg-transparent hover:bg-[var(--surface2)] text-[var(--ink)]';
        break;
      case 'secondary':
        variantClasses =
          'bg-[var(--pri-soft)] text-[var(--pri-text)] hover:bg-[var(--pri)]/20';
        break;
      case 'ghost':
        variantClasses =
          'hover:bg-[var(--surface2)] text-[var(--ink)] hover:text-[var(--ink)]';
        break;
      case 'link':
        variantClasses = 'text-[var(--pri-text)] underline-offset-4 hover:underline';
        break;
    }

    let sizeClasses = 'h-10 px-4 py-2';
    switch (size) {
      case 'sm':
        sizeClasses = 'h-8 rounded-[var(--r-sm)] px-3 text-xs';
        break;
      case 'lg':
        sizeClasses = 'h-12 rounded-[var(--r-md)] px-8 text-base';
        break;
      case 'icon':
        sizeClasses = 'size-9 p-0';
        break;
    }

    return (
      <button
        ref={ref}
        className={`${base} ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
