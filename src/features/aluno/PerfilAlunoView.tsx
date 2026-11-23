import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import {
  Aluno,
  Quarto,
  LancamentoPonto,
  Advertencia,
  Infracao,
  Disciplina,
  ObservacaoSensivel,
  VistoriaItem
} from '../../types';
import { ScoreCount } from '../../components/ui/ScoreCount';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { AjustarPontosModal } from '../pontos/AjustarPontosModal';
import { AdvertenciaModal } from '../advertencias/AdvertenciaModal';
import { useToast } from '../../components/ui/Toast';
import {
  getScoreAluno,
  mediaNecessaria,
  getConfig,
  contestarLancamento,
  marcarDisciplinaCumprida,
  decidirContestacao
} from '../../lib/regras';
import {
  User,
  Sparkles,
  AlertTriangle,
  ClipboardList,
  Lock,
  Plus,
  Compass,
  CheckCircle,
  Clock,
  Send,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

export function PerfilAlunoView({
  alunoId,
  onBack,
}: {
  alunoId: string;
  onBack?: () => void;
}) {
  const { currentUser, canAccessStudent, canViewSensitiveNotes } = useAuth();
  const { showToast } = useToast();

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [quarto, setQuarto] = useState<Quarto | null>(null);
  const [scoreTotal, setScoreTotal] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pontos' | 'advertencias' | 'vistorias' | 'disciplina' | 'passeio' | 'observacoes'>('resumo');

  const [pontos, setPontos] = useState<LancamentoPonto[]>([]);
  const [advertencias, setAdvertencias] = useState<Advertencia[]>([]);
  const [infracoes, setInfracoes] = useState<Infracao[]>([]);
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [vistoriasItens, setVistoriasItens] = useState<VistoriaItem[]>([]);
  const [observacoes, setObservacoes] = useState<ObservacaoSensivel[]>([]);
  const [novaObs, setNovaObs] = useState<string>('');

  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [isAdvModalOpen, setIsAdvModalOpen] = useState(false);

  // Contestação modal/state
  const [contestandoPontoId, setContestandoPontoId] = useState<string | null>(null);
  const [justificativaContestacao, setJustificativaContestacao] = useState<string>('');

  const carregarDados = async () => {
    const a = await db.alunos.get(alunoId);
    if (!a) return;
    setAluno(a);

    if (a.quarto_id) {
      const q = await db.quartos.get(a.quarto_id);
      setQuarto(q || null);
    }

    const sc = await getScoreAluno(alunoId);
    setScoreTotal(sc);

    const pts = (await db.lancamentos_pontos
      .where('aluno_id')
      .equals(alunoId)
      .toArray())
      .sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
    setPontos(pts);

    const advs = (await db.advertencias
      .where('aluno_id')
      .equals(alunoId)
      .toArray())
      .sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
    setAdvertencias(advs);

    const infs = (await db.infracoes
      .where('aluno_id')
      .equals(alunoId)
      .toArray())
      .sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
    setInfracoes(infs);

    const disc = await db.disciplinas.where('aluno_id').equals(alunoId).first();
    setDisciplina(disc || null);

    const vItens = await db.vistoria_itens
      .where('aluno_id')
      .equals(alunoId)
      .toArray();
    setVistoriasItens(vItens);

    // Carregar observações sensíveis se tiver permissão
    if (canViewSensitiveNotes()) {
      const obs = await db.observacoes_sensiveis
        .where('aluno_id')
        .equals(alunoId)
        .reverse()
        .sortBy('criado_em');
      setObservacoes(obs);

      // Registrar auditoria de acesso sensível
      if (currentUser) {
        await db.acessos_sensiveis.add({
          id: Date.now(),
          usuario_id: currentUser.id,
          aluno_id: alunoId,
          recurso: 'observacoes_sensiveis',
          em: new Date().toISOString(),
        });
      }
    }
  };

  useEffect(() => {
    carregarDados();
  }, [alunoId]);

  if (!aluno) {
    return (
      <div className="card text-center py-12">
        <p className="text-sm text-[var(--ink2)]">Carregando dados do aluno...</p>
      </div>
    );
  }

  // Verificação de permissão RLS
  if (!canAccessStudent(aluno.id, aluno.quarto_id)) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-[var(--bad)] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[var(--ink)]">Acesso Restrito</h3>
        <p className="text-sm text-[var(--ink2)] mt-1">
          Você não tem permissão para visualizar o perfil deste aluno. Monitores acessam apenas os alunos de seu dormitório.
        </p>
        {onBack && (
          <button onClick={onBack} className="btn ghost sm mt-4">
            Voltar
          </button>
        )}
      </div>
    );
  }

  // Cálculo da Meta do Passeio (Regra do prompt: meta 4.0 em 30 dias, 10 dias passados com 36 pontos -> 4.2 por dia)
  const metaPeriodo = 4.0;
  const totalDiasPeriodo = 30;
  const diasPassados = 10;
  const diasRestantes = totalDiasPeriodo - diasPassados;
  const pontosAtuais = Math.max(0, scoreTotal);
  const mediaNec = mediaNecessaria(metaPeriodo, totalDiasPeriodo, pontosAtuais, diasRestantes);

  // Status de Elegibilidade para o passeio
  const isElegivel = !aluno.em_disciplina && infracoes.length === 0 && (mediaNec !== null && mediaNec <= 5);
  const isEmRisco = !isElegivel && !aluno.em_disciplina && infracoes.length <= 1;

  // Lidar com envio de contestação
  const handleEnviarContestacao = async (pontoId: string) => {
    if (!justificativaContestacao.trim()) {
      showToast('Informe a justificativa da contestação.');
      return;
    }
    await contestarLancamento(pontoId, aluno.id, justificativaContestacao.trim());
    showToast('Contestação enviada para análise da preceptoria.');
    setContestandoPontoId(null);
    setJustificativaContestacao('');
    carregarDados();
  };

  // Lidar com decisão de contestação (preceptor/direção)
  const handleDecidirContestacao = async (pontoId: string, status: 'aceita' | 'negada') => {
    if (!currentUser) return;
    await decidirContestacao(pontoId, currentUser.id, status);
    showToast(`Contestação ${status === 'aceita' ? 'aceita (ponto estornado)' : 'negada'}.`);
    carregarDados();
  };

  // Marcar disciplina como cumprida
  const handleCumprirDisciplina = async () => {
    if (!disciplina || !currentUser) return;
    await marcarDisciplinaCumprida(disciplina.id, currentUser.id);
    showToast(`${aluno.nome} cumpriu a disciplina e foi liberado.`);
    carregarDados();
  };

  // Salvar nova observação sensível
  const handleSalvarObservacao = async () => {
    if (!novaObs.trim() || !currentUser) return;
    await db.observacoes_sensiveis.add({
      id: crypto.randomUUID(),
      aluno_id: aluno.id,
      texto: novaObs.trim(),
      autor_id: currentUser.id,
      criado_em: new Date().toISOString(),
    });
    setNovaObs('');
    showToast('Observação confidencial salva.');
    carregarDados();
  };

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto pb-20">
      {/* Botão Voltar */}
      {onBack && (
        <button
          onClick={onBack}
          className="btn sm ghost w-fit flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para lista
        </button>
      )}

      {/* Hero do Perfil: Score Grande e Badges de Estado */}
      <div className="card p-5 sm:p-6 bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--pri-soft)] border-2 border-[var(--pri)] flex items-center justify-center text-[var(--pri-text)] shrink-0">
            <User className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] tracking-tight">
                {aluno.nome}
              </h1>
              {aluno.em_disciplina ? (
                <Badge variant="disc">De disciplina</Badge>
              ) : isElegivel ? (
                <Badge variant="ok">Elegível para o passeio</Badge>
              ) : isEmRisco ? (
                <Badge variant="warn">Em risco</Badge>
              ) : (
                <Badge variant="bad">Não elegível</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink2)] font-medium">
              <span>{quarto?.nome || 'Dormitório'}</span>
              <span>·</span>
              <span>Equipe das {aluno.grupo}</span>
              <span>·</span>
              <span>{infracoes.length} infração(ões)</span>
              <span>·</span>
              <span>{advertencias.length} advertência(s)</span>
            </div>
          </div>
        </div>

        {/* Score Grande Animado com algarismos tabulares */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-[var(--line)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink2)]">
            Score Atual
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-[var(--ink)]">
              {scoreTotal >= 0 ? `+` : ''}
              <ScoreCount value={scoreTotal} />
            </span>
            <span className="text-sm font-bold text-[var(--ink2)]">pts</span>
          </div>

          {/* Botões de Ação do Perfil */}
          {currentUser?.papel !== 'aluno' && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setIsAjusteModalOpen(true)}
                className="btn sm font-bold cursor-pointer"
                title="Ajustar pontuação com motivo obrigatório"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Ajustar pontos
              </button>
              <button
                onClick={() => setIsAdvModalOpen(true)}
                className="btn sm sec font-bold cursor-pointer"
                title="Lançar advertência para este aluno"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[var(--warn)]" />
                Advertência
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--line)] pb-2 scrollbar-none text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('resumo')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'resumo'
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]'
              : 'text-[var(--ink2)] hover:text-[var(--ink)]'
          }`}
        >
          Resumo
        </button>
        <button
          onClick={() => setActiveTab('pontos')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
            activeTab === 'pontos'
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]'
              : 'text-[var(--ink2)] hover:text-[var(--ink)]'
          }`}
        >
          <span>Extrato de Pontos</span>
          <span className="text-[10px] bg-[var(--surface2)] px-1.5 py-0.2 rounded-full font-bold">
            {pontos.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('advertencias')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
            activeTab === 'advertencias'
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]'
              : 'text-[var(--ink2)] hover:text-[var(--ink)]'
          }`}
        >
          <span>Advertências e Infrações</span>
          {(advertencias.length > 0 || infracoes.length > 0) && (
            <span className="text-[10px] bg-[var(--warn-soft)] text-[var(--warn)] px-1.5 py-0.2 rounded-full font-bold">
              {advertencias.length + infracoes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('vistorias')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'vistorias'
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]'
              : 'text-[var(--ink2)] hover:text-[var(--ink)]'
          }`}
        >
          Vistorias
        </button>
        <button
          onClick={() => setActiveTab('passeio')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'passeio'
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]'
              : 'text-[var(--ink2)] hover:text-[var(--ink)]'
          }`}
        >
          Meta do Passeio
        </button>
        {aluno.em_disciplina && (
          <button
            onClick={() => setActiveTab('disciplina')}
            className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 text-[var(--disc)] ${
              activeTab === 'disciplina'
                ? 'bg-[var(--disc-soft)] font-bold border border-[var(--disc)]/30'
                : 'hover:bg-[var(--disc-soft)]'
            }`}
          >
            <span>Disciplina</span>
            <span className="w-2 h-2 rounded-full bg-[var(--disc)] animate-pulse" />
          </button>
        )}
        {canViewSensitiveNotes() && (
          <button
            onClick={() => setActiveTab('observacoes')}
            className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 text-[var(--disc)] ${
              activeTab === 'observacoes'
                ? 'bg-[var(--disc-soft)] font-bold border border-[var(--disc)]/30'
                : 'hover:bg-[var(--disc-soft)]'
            }`}
          >
            <Lock className="w-3 h-3 text-[var(--disc)]" />
            <span>Área Restrita</span>
          </button>
        )}
      </div>

      {/* Conteúdo das Abas */}
      {/* 1. Aba Resumo */}
      {activeTab === 'resumo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 sm:p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ink2)]">
              Conduta e Registro Geral
            </h3>
            <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-[var(--line)]">
                <span className="text-[var(--ink2)]">Dormitório Alocado:</span>
                <strong className="text-[var(--ink)]">{quarto?.nome}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--line)]">
                <span className="text-[var(--ink2)]">Equipe do Internato:</span>
                <strong className="text-[var(--ink)]">Equipe das {aluno.grupo}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--line)]">
                <span className="text-[var(--ink2)]">Status de Matrícula:</span>
                <Badge variant="ok">Ativo / Regular</Badge>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--line)]">
                <span className="text-[var(--ink2)]">Situação Disciplinar:</span>
                {aluno.em_disciplina ? (
                  <Badge variant="disc">De disciplina</Badge>
                ) : (
                  <Badge variant="ok">Sem pendências</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ink2)]">
              Resumo da Meta do Passeio
            </h3>
            <div className="p-3.5 rounded-xl bg-[var(--surface2)] flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Progresso do período</span>
                <span>Meta diária: {metaPeriodo.toFixed(1)} pts</span>
              </div>
              <ProgressBar value={scoreTotal} max={metaPeriodo * totalDiasPeriodo} />
              <p className="text-xs text-[var(--ink2)] leading-relaxed mt-1">
                {mediaNec !== null && mediaNec <= 5 ? (
                  <>
                    Média necessária: <strong className="text-[var(--ink)]">{mediaNec.toFixed(1)} pontos por dia</strong> nos {diasRestantes} dias que faltam.
                  </>
                ) : (
                  <span className="text-[var(--bad)] font-semibold">
                    Meta inatingível neste período.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Aba Extrato de Pontos */}
      {activeTab === 'pontos' && (
        <div className="card p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--ink)]">Histórico de Lançamentos</h3>
            {currentUser?.papel !== 'aluno' && (
              <button
                onClick={() => setIsAjusteModalOpen(true)}
                className="btn sm font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Novo ajuste
              </button>
            )}
          </div>

          {pontos.length === 0 ? (
            <p className="text-xs text-[var(--ink2)] py-6 text-center">Nenhum lançamento de ponto registrado.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {pontos.map((p) => {
                const isContestavel = currentUser?.papel === 'aluno' && !p.contestacao && p.valor < 0;
                const temContestacao = !!p.contestacao;

                return (
                  <div key={p.id} className="py-3 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-extrabold tabular-nums ${p.valor > 0 ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}`}>
                            {p.valor > 0 ? `+${p.valor}` : p.valor} pts
                          </span>
                          <span className="text-sm font-semibold text-[var(--ink)]">{p.motivo}</span>
                        </div>
                        <span className="text-xs text-[var(--ink2)]">
                          {new Date(p.criado_em).toLocaleDateString('pt-BR')} às {new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Botão de Contestação para o Aluno */}
                      {isContestavel && (
                        <button
                          onClick={() => setContestandoPontoId(p.id)}
                          className="btn sm ghost text-xs text-[var(--warn)] hover:border-[var(--warn)]"
                        >
                          Contestar
                        </button>
                      )}

                      {/* Status de Contestação se houver */}
                      {temContestacao && (
                        <div className="text-right">
                          <Badge
                            variant={
                              p.contestacao_status === 'aceita'
                                ? 'ok'
                                : p.contestacao_status === 'negada'
                                ? 'bad'
                                : 'warn'
                            }
                          >
                            Contestação {p.contestacao_status || 'aberta'}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Formulário inline de contestação */}
                    {contestandoPontoId === p.id && (
                      <div className="p-3 rounded-lg bg-[var(--surface2)] mt-2 flex flex-col gap-2">
                        <label className="text-xs font-bold text-[var(--ink)]">
                          Justificativa para a preceptoria:
                        </label>
                        <textarea
                          value={justificativaContestacao}
                          onChange={(e) => setJustificativaContestacao(e.target.value)}
                          placeholder="Explique o motivo da contestação deste lançamento..."
                          className="f text-xs"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setContestandoPontoId(null)}
                            className="btn ghost sm text-xs"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleEnviarContestacao(p.id)}
                            className="btn sm font-bold text-xs"
                          >
                            Enviar contestação
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Exibição da Contestação para Preceptor/Direção decidirem */}
                    {temContestacao && p.contestacao_status === 'aberta' && (currentUser?.papel === 'preceptor' || currentUser?.papel === 'direcao') && (
                      <div className="p-2.5 rounded-lg bg-[var(--warn-soft)] text-xs text-[var(--warn)] mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <strong>Contestação do aluno:</strong> "{p.contestacao}"
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleDecidirContestacao(p.id, 'aceita')}
                            className="btn sm sec text-xs font-bold text-[var(--ok)]"
                          >
                            Aceitar (estornar)
                          </button>
                          <button
                            onClick={() => handleDecidirContestacao(p.id, 'negada')}
                            className="btn sm ghost text-xs font-bold text-[var(--bad)]"
                          >
                            Negar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Aba Advertências e Infrações */}
      {activeTab === 'advertencias' && (
        <div className="flex flex-col gap-4">
          {/* Infrações */}
          <div className="card p-4 sm:p-5 flex flex-col gap-3">
            <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[var(--bad)]" />
              Infrações Registradas ({infracoes.length})
            </h3>
            {infracoes.length === 0 ? (
              <p className="text-xs text-[var(--ok)] font-medium">Nenhuma infração registrada no curso.</p>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {infracoes.map((inf) => (
                  <div key={inf.id} className="py-2.5 flex items-start justify-between text-xs">
                    <div>
                      <strong className="text-[var(--bad)] block">{inf.descricao}</strong>
                      <span className="text-[var(--ink2)]">
                        Tópico: {inf.topico} · Origem: {inf.origem} · {new Date(inf.criado_em).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <Badge variant="bad">Infração</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advertências */}
          <div className="card p-4 sm:p-5 flex flex-col gap-3">
            <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--warn)]" />
              Advertências Leves ({advertencias.length})
            </h3>
            {advertencias.length === 0 ? (
              <p className="text-xs text-[var(--ink2)]">Nenhuma advertência registrada.</p>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {advertencias.map((adv) => (
                  <div key={adv.id} className="py-2.5 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-bold text-[var(--ink)] block">{adv.motivo_descricao || adv.obs}</span>
                      <span className="text-[var(--ink2)]">
                        {new Date(adv.criado_em).toLocaleDateString('pt-BR')} · Score: -1 pt
                      </span>
                      {adv.obs && adv.obs !== adv.motivo_descricao && (
                        <p className="text-[11px] text-[var(--ink2)] italic mt-0.5">"{adv.obs}"</p>
                      )}
                    </div>
                    {adv.infracao_id ? (
                      <span className="text-[10px] text-[var(--bad)] font-semibold bg-[var(--bad-soft)] px-2 py-0.5 rounded-full">
                        Gerou infração
                      </span>
                    ) : (
                      <Badge variant="warn">Ativa</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Aba Vistorias */}
      {activeTab === 'vistorias' && (
        <div className="card p-4 sm:p-5 flex flex-col gap-3">
          <h3 className="text-base font-bold text-[var(--ink)]">Histórico de Avaliações nos Dormitórios</h3>
          {vistoriasItens.length === 0 ? (
            <p className="text-xs text-[var(--ink2)] py-6 text-center">Nenhuma vistoria individual gravada ainda.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {vistoriasItens.map((vi) => (
                <div key={vi.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold uppercase text-[var(--ink)] block">{vi.item}</span>
                    <span className="text-[var(--ink2)]">Peso de falha: {vi.peso_falha}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm">Nota {vi.nota}</span>
                    <Badge variant={vi.nota >= 4 ? 'ok' : vi.nota === 3 ? 'warn' : 'bad'}>
                      {vi.nota >= 4 ? 'Aprovado' : 'Falha'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Aba Disciplina */}
      {activeTab === 'disciplina' && disciplina && (
        <div className="card border-2 border-[var(--disc)] bg-[var(--surface)] p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--disc)]">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-lg font-bold">Situação Disciplinar Ativa</h3>
            </div>
            <Badge variant="disc">De disciplina</Badge>
          </div>

          <p className="text-xs text-[var(--ink2)]">
            Com 3 infrações acumuladas no curso, o aluno cumpre disciplina e atividades práticas formativas.
          </p>

          <div className="p-4 rounded-xl bg-[var(--disc-soft)] text-xs text-[var(--disc)] flex flex-col gap-2">
            <div className="flex justify-between">
              <strong>Trabalho / Tarefa formativa:</strong>
              <span>{disciplina.trabalho_tipo || 'Auxílio na organização do refeitório e pátio'}</span>
            </div>
            <div className="flex justify-between">
              <strong>Carga horária / Prazo:</strong>
              <span>{disciplina.trabalho_quantidade || '2 horas no contraturno'}</span>
            </div>
            <div className="flex justify-between">
              <strong>Status atual:</strong>
              <span className="uppercase font-bold">{disciplina.status}</span>
            </div>
          </div>

          {currentUser?.papel !== 'aluno' && disciplina.status !== 'cumprida' && (
            <button
              onClick={handleCumprirDisciplina}
              className="btn font-bold bg-[var(--gold)] text-white w-full sm:w-auto self-end cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Marcar como cumprido (Liberar aluno)
            </button>
          )}
        </div>
      )}

      {/* 6. Aba Meta do Passeio */}
      {activeTab === 'passeio' && (
        <div className="card p-5 flex flex-col gap-4">
          <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[var(--ok)]" />
            Elegibilidade e Meta Proporcional
          </h3>

          <div className="p-4 rounded-xl bg-[var(--surface2)] flex flex-col gap-3">
            <div className="flex justify-between text-xs">
              <span>Dias transcorridos: <strong>{diasPassados} de {totalDiasPeriodo} dias</strong></span>
              <span>Pontos acumulados: <strong>{pontosAtuais} pts</strong></span>
            </div>
            <ProgressBar value={pontosAtuais} max={metaPeriodo * totalDiasPeriodo} />
            <div className="p-3 rounded-lg bg-[var(--surface)] text-xs border border-[var(--line)]">
              <span className="font-bold block text-[var(--ink)] mb-0.5">Fórmula de Média Necessária:</span>
              <p className="text-[var(--ink2)] leading-relaxed">
                (Meta × Total de dias − Pontos já feitos) ÷ Dias que faltam<br />
                ({metaPeriodo.toFixed(1)} × {totalDiasPeriodo} − {pontosAtuais}) ÷ {diasRestantes} ={' '}
                <strong className="text-[var(--pri-text)] font-extrabold text-sm">
                  {mediaNec !== null ? `${mediaNec.toFixed(1)} pontos/dia` : 'Inatingível'}
                </strong>
              </p>
            </div>
          </div>

          <div className="text-xs text-[var(--ink2)] space-y-1">
            <p>• <strong>Elegível:</strong> Score proporcional dentro da meta, zero infrações no período e presença regular.</p>
            <p>• <strong>Em risco:</strong> Média abaixo da meta ou 1 infração registrada.</p>
            <p>• <strong>Trava de Infração:</strong> Qualquer infração bloqueia a elegibilidade direta para o passeio do período.</p>
          </div>
        </div>
      )}

      {/* 7. Aba Observações Sensíveis (Área Restrita - Preceptor e Direção) */}
      {activeTab === 'observacoes' && canViewSensitiveNotes() && (
        <div className="card border-2 border-[var(--disc)] p-5 flex flex-col gap-4 bg-[var(--surface)]">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--disc)]/30">
            <div className="flex items-center gap-2 text-[var(--disc)]">
              <Lock className="w-5 h-5" />
              <div>
                <h3 className="text-base font-extrabold">Área Restrita (Acompanhamento Pastoral & Social)</h3>
                <span className="text-[11px] text-[var(--ink2)]">Visível exclusivamente para Preceptor e Direção (LGPD). Todos os acessos são auditados.</span>
              </div>
            </div>
            <Badge variant="disc">Confidencial</Badge>
          </div>

          {/* Adicionar nova observação */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--ink)]">Nova anotação de acompanhamento:</label>
            <textarea
              value={novaObs}
              onChange={(e) => setNovaObs(e.target.value)}
              placeholder="Anotações pastorais, conduta familiar, saúde ou acompanhamento individual..."
              className="f text-xs"
              rows={3}
            />
            <button
              onClick={handleSalvarObservacao}
              disabled={!novaObs.trim()}
              className="btn sm self-end font-bold cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Salvar observação
            </button>
          </div>

          {/* Lista de Observações Confidenciais */}
          <div className="flex flex-col gap-2.5 mt-2">
            <span className="text-xs font-bold text-[var(--ink2)] uppercase tracking-wider">
              Histórico Confidencial ({observacoes.length})
            </span>
            {observacoes.length === 0 ? (
              <p className="text-xs text-[var(--ink2)] py-4 text-center">Nenhuma anotação confidencial registrada para este aluno.</p>
            ) : (
              observacoes.map((o) => (
                <div key={o.id} className="p-3 rounded-lg bg-[var(--disc-soft)] text-xs text-[var(--ink)] border border-[var(--disc)]/20">
                  <p className="whitespace-pre-wrap">{o.texto}</p>
                  <span className="text-[10px] text-[var(--disc)] font-semibold block mt-1.5">
                    Registrado em {new Date(o.criado_em).toLocaleDateString('pt-BR')} às {new Date(o.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modais de Ajuste de Pontos e Advertência */}
      <AjustarPontosModal
        aluno={aluno}
        isOpen={isAjusteModalOpen}
        onClose={() => setIsAjusteModalOpen(false)}
        onSuccess={carregarDados}
      />

      <AdvertenciaModal
        alunoIdInicial={aluno.id}
        isOpen={isAdvModalOpen}
        onClose={() => setIsAdvModalOpen(false)}
        onSuccess={carregarDados}
      />
    </div>
  );
}
