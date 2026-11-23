import React from 'react';
import { useSidebar } from './sidebar';
import { useAuth } from '../../../context/AuthContext';
import { useOnlineStatus } from '../../../lib/offline';
import { PWAInstallButton } from '../PWAInstallButton';
import {
  LayoutDashboard,
  BarChart3,
  ClipboardCheck,
  Calendar,
  Users,
  AlertTriangle,
  Sparkles,
  Compass,
  ShieldCheck,
  Moon,
  Sun,
  X,
  Wifi,
  WifiOff,
  LogOut,
  ChevronRight,
  Printer
} from 'lucide-react';

export function App1Sidebar({
  currentView = 'app1',
  onSelectView,
  onOpenCriterios,
}: {
  currentView?: string;
  onSelectView?: (view: string) => void;
  onOpenCriterios?: () => void;
}) {
  const { open, setOpen, isMobile } = useSidebar();
  const { currentUser, perfis, switchProfile, logout } = useAuth();
  const { isOnline, toggleForcedOffline, pendingCount } = useOnlineStatus();

  const toggleTheme = () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    {
      group: 'Painéis & Análise',
      items: [
        { id: 'app1', label: 'Dashboard de Tarefas', icon: BarChart3, badge: 'Novo' },
        { id: 'dashboard', label: 'Painel Geral de Conduta', icon: LayoutDashboard },
        { id: 'relatorios', label: 'Relatórios & Impressão', icon: Printer, badge: 'Etapa 2' },
      ],
    },
    {
      group: 'Rotina do Internato',
      items: [
        { id: 'vistoria', label: 'Vistoria dos Quartos', icon: ClipboardCheck },
        { id: 'escalas', label: 'Escalas de Trabalho', icon: Calendar },
        { id: 'alunos', label: currentUser?.papel === 'aluno' ? 'Meu Perfil' : 'Alunos e Scores', icon: Users },
      ],
    },
    {
      group: 'Regulamento & Critérios',
      items: [
        { id: 'criterios', label: 'Critérios de Aceite', icon: ShieldCheck },
      ],
    },
  ];

  if (!open && !isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--line)] bg-[var(--surface)] transition-transform duration-300 md:static ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header da Sidebar com Logo oficial do ICEVES */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--line)] px-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="ICEVES Logo"
              className="size-8 rounded-full border border-[var(--line)] object-cover shadow-2xs"
            />
            <div>
              <span className="block font-extrabold text-sm tracking-tight text-[var(--ink)] leading-none">
                ICEVES CRM
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink2)]">
                Escola de Cristo
              </span>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-[var(--ink2)] hover:bg-[var(--surface2)]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navItems.map((section) => (
            <div key={section.group} className="space-y-1">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--ink2)]">
                {section.group}
              </span>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const isActive = currentView === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'criterios') {
                          onOpenCriterios?.();
                        } else {
                          onSelectView?.(item.id);
                        }
                        if (isMobile) setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-[var(--r-md)] px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--pri)] text-[var(--pri-ink)] font-bold shadow-xs'
                          : 'text-[var(--ink)] hover:bg-[var(--surface2)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`size-4 shrink-0 ${isActive ? 'text-black' : 'text-[var(--ink2)]'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                          isActive ? 'bg-black text-[var(--pri)]' : 'bg-[var(--pri-soft)] text-[var(--pri-text)]'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Atalhos Rápidos */}
          <div className="space-y-2 pt-2 border-t border-[var(--line)]">
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--ink2)]">
              Atalhos Rápidos
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSelectView?.('vistoria');
                  if (isMobile) setOpen(false);
                }}
                className="p-2 rounded-[var(--r-md)] bg-[var(--surface2)] hover:bg-[var(--pri-soft)] hover:text-[var(--pri-text)] text-xs font-semibold text-[var(--ink)] flex flex-col items-center gap-1 transition-colors cursor-pointer text-center"
              >
                <ClipboardCheck className="size-4 text-[var(--pri-text)]" />
                <span className="text-[10px]">Vistoria</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectView?.('escalas');
                  if (isMobile) setOpen(false);
                }}
                className="p-2 rounded-[var(--r-md)] bg-[var(--surface2)] hover:bg-[var(--ok-soft)] hover:text-[var(--ok)] text-xs font-semibold text-[var(--ink)] flex flex-col items-center gap-1 transition-colors cursor-pointer text-center"
              >
                <Calendar className="size-4 text-[var(--ok)]" />
                <span className="text-[10px]">Escalas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé da Sidebar: Perfil, Conexão, Tema */}
        <div className="border-t border-[var(--line)] p-3 space-y-2 bg-[var(--surface)]">
          {/* Indicador de Conexão */}
          <div className="flex items-center justify-between text-[11px] px-1 text-[var(--ink2)]">
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <>
                  <Wifi className="size-3.5 text-[var(--ok)]" />
                  <span className="font-medium text-[var(--ok)]">Online PWA</span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3.5 text-[var(--warn)] animate-pulse" />
                  <span className="font-bold text-[var(--warn)]">Modo Offline</span>
                </>
              )}
            </div>
            <button
              onClick={toggleTheme}
              className="p-1 rounded-md text-[var(--ink2)] hover:text-[var(--ink)] hover:bg-[var(--surface2)] cursor-pointer"
              title="Alternar tema claro e escuro"
            >
              {document.documentElement.dataset.theme === 'dark' ? (
                <Sun className="size-3.5 text-[var(--pri)]" />
              ) : (
                <Moon className="size-3.5" />
              )}
            </button>
          </div>

          {/* Informações do Usuário Conectado */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-[var(--r-md)] bg-[var(--surface2)]">
            <div className="flex items-center gap-2 truncate">
              <div className="size-7 rounded-full bg-[var(--pri)] text-black font-extrabold text-xs flex items-center justify-center shrink-0">
                {currentUser?.nome ? currentUser.nome.charAt(0) : 'U'}
              </div>
              <div className="truncate text-left">
                <span className="block truncate text-xs font-bold text-[var(--ink)]">
                  {currentUser?.nome || 'Monitor'}
                </span>
                <span className="block truncate text-[10px] uppercase font-semibold text-[var(--ink2)]">
                  {currentUser?.papel}
                </span>
              </div>
            </div>

            <select
              value={currentUser?.id || ''}
              onChange={(e) => switchProfile(e.target.value)}
              className="text-[10px] bg-transparent font-bold text-[var(--pri-text)] cursor-pointer max-w-[70px] truncate focus:outline-none"
              title="Trocar perfil"
            >
              {perfis.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--ink)]">
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>
    </>
  );
}

export default App1Sidebar;
