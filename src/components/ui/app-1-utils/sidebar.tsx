import React, { createContext, useContext, useState, useEffect } from 'react';
import { PanelLeft, Menu } from 'lucide-react';

interface SidebarContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  open: true,
  setOpen: () => {},
  toggleSidebar: () => {},
  isMobile: false,
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => setOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar, isMobile }}>
      <div className="relative flex min-h-screen w-full bg-[var(--bg)] text-[var(--ink)]">
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function SidebarInset({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col bg-[var(--bg)] transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}

export function SidebarTrigger({
  className = '',
  'aria-label': ariaLabel = 'Toggle navigation',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center rounded-[var(--r-md)] p-2 text-[var(--ink2)] hover:bg-[var(--surface2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] cursor-pointer transition-colors ${className}`}
      {...props}
    >
      <PanelLeft className="size-5" />
      <span className="sr-only">Toggle navigation</span>
    </button>
  );
}
