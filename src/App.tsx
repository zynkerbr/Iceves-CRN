import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { LoginView } from './features/login/LoginView';
import { MonitorDashboard } from './features/dashboard/MonitorDashboard';
import { VistoriaView } from './features/vistoria/VistoriaView';
import { EscalasView } from './features/escalas/EscalasView';
import { ListaAlunosView } from './features/aluno/ListaAlunosView';
import { PerfilAlunoView } from './features/aluno/PerfilAlunoView';
import { RelatoriosView } from './features/relatorios/RelatoriosView';
import { AdvertenciaModal } from './features/advertencias/AdvertenciaModal';
import { CriteriosTestModal } from './features/criterios/CriteriosTestModal';
import { App1Content } from './components/ui/app-1';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from './components/ui/app-1-utils/sidebar';
import { App1Sidebar } from './components/ui/app-1-utils/app-1-sidebar';

function AppContent() {
  const { currentUser } = useAuth();
  // Padrão: 'app1' (o novo dashboard com Task Throughput, estatísticas e projetos ativos)
  const [activeTab, setActiveTab] = useState<string>('app1');
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string | null>(null);

  // Modais globais
  const [isAdvModalOpen, setIsAdvModalOpen] = useState(false);
  const [advAlunoAlvo, setAdvAlunoAlvo] = useState<string | undefined>();
  const [isCriteriosOpen, setIsCriteriosOpen] = useState(false);

  const handleOpenAluno = (alunoId: string) => {
    setAlunoSelecionadoId(alunoId);
    setActiveTab('aluno_detalhe');
  };

  const handleOpenAdvertencia = (alunoId?: string) => {
    setAdvAlunoAlvo(alunoId);
    setIsAdvModalOpen(true);
  };

  const handleSelectView = (view: string) => {
    if (view === 'alunos' && currentUser?.papel === 'aluno' && currentUser?.aluno_id) {
      handleOpenAluno(currentUser.aluno_id);
    } else {
      setActiveTab(view);
    }
  };

  // Se não estiver logado, exibe tela de login
  if (!currentUser) {
    return <LoginView onLoggedIn={() => setActiveTab('app1')} />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Sidebar Oficial seguindo o Design System do ICEVES */}
      <App1Sidebar
        currentView={activeTab}
        onSelectView={handleSelectView}
        onOpenCriterios={() => setIsCriteriosOpen(true)}
      />

      <SidebarInset className="min-w-0 flex flex-col flex-1">
        {/* Faixa Discreta de Conectividade / Offline */}
        <OfflineBanner />

        {/* Conteúdo Dinâmico por Aba */}
        {activeTab === 'app1' && (
          <App1Content
            onSelectView={handleSelectView}
            onOpenAluno={handleOpenAluno}
            onOpenAdvertencia={handleOpenAdvertencia}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="flex-1 flex flex-col">
            <Header
              activeTab={activeTab}
              onSelectTab={handleSelectView}
              onOpenCriterios={() => setIsCriteriosOpen(true)}
              onOpenSearch={() => setActiveTab('alunos')}
            />
            <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1">
              <MonitorDashboard
                onNavigate={handleSelectView}
                onOpenAdvertencia={handleOpenAdvertencia}
                onOpenAluno={handleOpenAluno}
              />
            </main>
          </div>
        )}

        {activeTab === 'vistoria' && (
          <div className="flex-1 flex flex-col">
            <Header
              activeTab={activeTab}
              onSelectTab={handleSelectView}
              onOpenCriterios={() => setIsCriteriosOpen(true)}
            />
            <main className="w-full max-w-[1040px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1">
              <VistoriaView onDone={() => setActiveTab('app1')} />
            </main>
          </div>
        )}

        {activeTab === 'escalas' && (
          <div className="flex-1 flex flex-col">
            <Header
              activeTab={activeTab}
              onSelectTab={handleSelectView}
              onOpenCriterios={() => setIsCriteriosOpen(true)}
            />
            <main className="w-full max-w-[1040px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1">
              <EscalasView />
            </main>
          </div>
        )}

        {activeTab === 'alunos' && (
          <div className="flex-1 flex flex-col">
            <Header
              activeTab={activeTab}
              onSelectTab={handleSelectView}
              onOpenCriterios={() => setIsCriteriosOpen(true)}
            />
            <main className="w-full max-w-[1040px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1">
              <ListaAlunosView
                onSelectAluno={handleOpenAluno}
                onOpenAdvertencia={handleOpenAdvertencia}
              />
            </main>
          </div>
        )}

        {activeTab === 'relatorios' && (
          <div className="flex-1 flex flex-col">
            <Header
              activeTab={activeTab}
              onSelectTab={handleSelectView}
              onOpenCriterios={() => setIsCriteriosOpen(true)}
            />
            <main className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1">
              <RelatoriosView onNavigate={handleSelectView} />
            </main>
          </div>
        )}

        {activeTab === 'aluno_detalhe' && alunoSelecionadoId && (
          <div className="flex-1 flex flex-col">
            <Header
              activeTab={activeTab}
              onSelectTab={handleSelectView}
              onOpenCriterios={() => setIsCriteriosOpen(true)}
            />
            <main className="w-full max-w-[1040px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1">
              <PerfilAlunoView
                alunoId={alunoSelecionadoId}
                onBack={() => {
                  if (currentUser.papel === 'aluno') {
                    setActiveTab('app1');
                  } else {
                    setActiveTab('alunos');
                  }
                }}
              />
            </main>
          </div>
        )}
      </SidebarInset>

      {/* Modal de Advertência Global */}
      <AdvertenciaModal
        alunoIdInicial={advAlunoAlvo}
        isOpen={isAdvModalOpen}
        onClose={() => {
          setIsAdvModalOpen(false);
          setAdvAlunoAlvo(undefined);
        }}
      />

      {/* Modal de Verificação dos Critérios de Aceite */}
      <CriteriosTestModal
        isOpen={isCriteriosOpen}
        onClose={() => setIsCriteriosOpen(false)}
      />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
