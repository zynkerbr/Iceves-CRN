import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../lib/offline';
import { PWAInstallButton } from './ui/PWAInstallButton';
import {
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Search,
  Bell,
  ShieldCheck,
  RotateCcw,
  User
} from 'lucide-react';
import { db } from '../lib/db';
import { useToast } from './ui/Toast';
import { SidebarTrigger } from './ui/app-1-utils/sidebar';

export function Header({
  activeTab,
  onSelectTab,
  onOpenCriterios,
  onOpenSearch,
}: {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCriterios?: () => void;
  onOpenSearch?: () => void;
}) {
  const { currentUser, perfis, switchProfile } = useAuth();
  const { isOnline, toggleForcedOffline, pendingCount } = useOnlineStatus();
  const { showToast } = useToast();
  const [notifCount, setNotifCount] = useState<number>(0);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const checkNotifs = async () => {
      const count = await db.notificacoes.where('lida').equals(0).count();
      setNotifCount(count);
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleResetData = async () => {
    if (window.confirm('Deseja restaurar os dados de exemplo para o padrão inicial?')) {
      await db.resetToSeed();
      showToast('Dados restaurados com sucesso.');
      setTimeout(() => window.location.reload(), 300);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--line)] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-2xs transition-colors">
      {/* Logo ou Nome do CRM à Esquerda + Alternador da Sidebar */}
      <div className="flex items-center gap-3 shrink-0">
        <SidebarTrigger aria-label="Alternar navegação" />
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 focus:outline-none group cursor-pointer text-left"
          title="Início - ICEVES CRM"
        >
          <img
            src="/logo.png"
            alt="ICEVES Logo"
            className="w-8 h-8 rounded-full object-cover border border-[var(--line)] group-hover:scale-105 transition-transform"
          />
          <div className="hidden sm:block">
            <span className="font-extrabold text-base tracking-tight text-[var(--ink)] block leading-tight">
              ICEVES
            </span>
            <span className="text-[10px] text-[var(--ink2)] font-semibold uppercase tracking-wider block">
              Escola de Cristo
            </span>
          </div>
        </button>
      </div>

      {/* 4.A: Ações da Direita (Pesquisa, Notificações, Avatar, Tema, Offline) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* PWA Install Button */}
        <div className="hidden xl:block">
          <PWAInstallButton />
        </div>

        {/* Botão de Pesquisa (Ref: lupa) */}
        <button
          onClick={() => {
            onSelectTab('alunos');
            onOpenSearch?.();
          }}
          className="w-8 h-8 rounded-full bg-[var(--surface2)] hover:bg-[var(--line)] flex items-center justify-center text-[var(--ink)] cursor-pointer transition-colors"
          title="Pesquisar aluno ou registro"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Botão de Notificações com Badge (Ref: sino) */}
        <div className="relative">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="w-8 h-8 rounded-full bg-[var(--surface2)] hover:bg-[var(--line)] flex items-center justify-center text-[var(--ink)] cursor-pointer transition-colors"
            title="Alertas e notificações"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--bad)] text-white text-[9px] font-extrabold flex items-center justify-center">
              {notifCount}
            </span>
          )}
        </div>

        {/* Indicador de Conexão Offline */}
        <button
          onClick={toggleForcedOffline}
          className={`btn sm ghost text-xs flex items-center gap-1 px-2.5 ${
            isOnline ? 'text-[var(--ok)]' : 'text-[var(--warn)] bg-[var(--warn-soft)]'
          }`}
          title={isOnline ? 'Conectado. Clique para simular offline.' : 'Modo offline ativo. Clique para reconectar.'}
        >
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          )}
          {pendingCount > 0 && (
            <span className="bg-[var(--bad)] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Seletor de Perfil do Usuário */}
        <div className="flex items-center gap-1.5 pl-1 border-l border-[var(--line)]">
          {/* Avatar circular (Ref: foto da Caroline) */}
          <div className="w-8 h-8 rounded-full bg-[var(--pri)] text-[var(--pri-ink)] font-extrabold text-xs flex items-center justify-center border border-[var(--pri-text)] shrink-0 shadow-2xs">
            {currentUser?.nome ? currentUser.nome.charAt(0) : 'U'}
          </div>

          <select
            value={currentUser?.id || ''}
            onChange={(e) => switchProfile(e.target.value)}
            className="text-xs bg-transparent border-0 font-bold text-[var(--ink)] cursor-pointer focus:outline-none max-w-[90px] sm:max-w-[140px] truncate"
            title="Trocar perfil de acesso"
          >
            {perfis.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--ink)]">
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Alternar Tema Claro / Escuro */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full bg-[var(--surface2)] hover:bg-[var(--line)] flex items-center justify-center text-[var(--ink)] cursor-pointer transition-colors"
          aria-label="Alternar tema claro e escuro"
          title={`Tema atual: ${theme}. Clique para alternar.`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-[var(--pri)]" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-[var(--ink)]" />
          )}
        </button>

        {/* Reset de Dados */}
        <button
          onClick={handleResetData}
          className="w-8 h-8 rounded-full bg-[var(--surface2)] hover:bg-[var(--bad-soft)] hover:text-[var(--bad)] flex items-center justify-center text-[var(--ink2)] cursor-pointer transition-colors"
          title="Restaurar dados iniciais de teste"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
