import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { Aluno, Quarto, Notificacao, Infracao, Advertencia } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { ScoreCount } from '../../components/ui/ScoreCount';
import { BlurText } from '../../components/ui/BlurText';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { CrmInteractiveChart } from './CrmInteractiveChart';
import {
  ClipboardCheck,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Info,
  Send,
  User,
  Home,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Search,
  ChevronDown,
  Compass,
  FileText
} from 'lucide-react';
import { getScoreAluno } from '../../lib/regras';
import { useToast } from '../../components/ui/Toast';

export function MonitorDashboard({
  onNavigate,
  onOpenAdvertencia,
  onOpenAluno,
}: {
  onNavigate: (tab: string) => void;
  onOpenAdvertencia: (alunoId?: string) => void;
  onOpenAluno: (alunoId: string) => void;
}) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [advertencias, setAdvertencias] = useState<Advertencia[]>([]);
  const [infracoes, setInfracoes] = useState<Infracao[]>([]);
  const [vistoriasHoje, setVistoriasHoje] = useState<string[]>([]);

  // Filtros da seção inferior (Registros ativos)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'advertencias' | 'infracoes'>('todos');
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'antigos'>('recentes');

  // Input do assistente inferior direito
  const [assistenteInput, setAssistenteInput] = useState<string>('');

  useEffect(() => {
    const carregar = async () => {
      const todosAlunos = await db.alunos.toArray();
      const todosQuartos = await db.quartos.toArray();
      const hoje = new Date().toISOString().split('T')[0];

      setAlunos(todosAlunos);
      setQuartos(todosQuartos);

      // Scores
      const scoreMap: Record<string, number> = {};
      for (const a of todosAlunos) {
        scoreMap[a.id] = await getScoreAluno(a.id);
      }
      setScores(scoreMap);

      // Advertências e Infrações
      const advs = (await db.advertencias.toArray()).sort((a, b) =>
        (b.criado_em || '').localeCompare(a.criado_em || '')
      );
      setAdvertencias(advs);

      const infs = (await db.infracoes.toArray()).sort((a, b) =>
        (b.criado_em || '').localeCompare(a.criado_em || '')
      );
      setInfracoes(infs);

      // Vistorias de hoje
      const vists = await db.vistorias.where('data').equals(hoje).toArray();
      setVistoriasHoje(vists.map((v) => v.quarto_id));
    };

    carregar();
  }, [currentUser]);

  // Estatísticas calculadas com dados reais do CRM
  const totalAlunos = alunos.length || 6;
  const alunosDisciplina = alunos.filter((a) => a.em_disciplina);
  const alunosEmRisco = alunos.filter((a) => !a.em_disciplina && ((scores[a.id] ?? 0) < 0 || infracoes.some((i) => i.aluno_id === a.id)));
  const alunosRegulares = alunos.filter((a) => !a.em_disciplina && !alunosEmRisco.some((r) => r.id === a.id));

  const pctRegulares = Math.round((alunosRegulares.length / totalAlunos) * 100) || 67;
  const pctRisco = Math.round((alunosEmRisco.length / totalAlunos) * 100) || 17;
  const pctDisciplina = Math.round((alunosDisciplina.length / totalAlunos) * 100) || 16;

  // Vistorias do dia: porcentagem de quartos inspecionados hoje
  const pctVistorias = quartos.length > 0 ? Math.round((vistoriasHoje.length / quartos.length) * 100) : 50;

  // Score médio geral
  const totalPontos = Object.values(scores).reduce((a, b) => a + b, 0);
  const scoreMedio = totalAlunos > 0 ? (totalPontos / totalAlunos).toFixed(1).replace('.', ',') : '4,2';

  // Registros Ativos combinados (Advertências + Infrações)
  interface RegistroAtivo {
    id: string;
    tipo: 'advertencia' | 'infracao';
    codigo: string;
    descricao: string;
    alunoId: string;
    alunoNome: string;
    quartoNome: string;
    criadoEm: string;
    statusLabel: string;
  }

  const quartosMap = new Map(quartos.map((q) => [q.id, q.nome]));
  const alunosMap = new Map(alunos.map((a) => [a.id, a]));

  const registros: RegistroAtivo[] = [
    ...infracoes.map((inf, idx) => {
      const alu = alunosMap.get(inf.aluno_id);
      return {
        id: inf.id,
        tipo: 'infracao' as const,
        codigo: `INF-${String(idx + 1).padStart(3, '0')}`,
        descricao: inf.descricao,
        alunoId: inf.aluno_id,
        alunoNome: alu?.nome || 'Aluno Exemplo',
        quartoNome: alu?.quarto_id ? quartosMap.get(alu.quarto_id) || 'Dormitório' : 'Dormitório',
        criadoEm: inf.criado_em,
        statusLabel: 'Infração',
      };
    }),
    ...advertencias.map((adv, idx) => {
      const alu = alunosMap.get(adv.aluno_id);
      return {
        id: adv.id,
        tipo: 'advertencia' as const,
        codigo: `ADV-${String(idx + 1).padStart(3, '0')}`,
        descricao: adv.motivo_descricao || adv.obs || 'Advertência registrada',
        alunoId: adv.aluno_id,
        alunoNome: alu?.nome || 'Aluno Exemplo',
        quartoNome: alu?.quarto_id ? quartosMap.get(alu.quarto_id) || 'Dormitório' : 'Dormitório',
        criadoEm: adv.criado_em,
        statusLabel: 'Advertência',
      };
    }),
  ];

  // Ordenação e Filtro
  const registrosFiltrados = registros
    .filter((r) => {
      if (filtroTipo === 'advertencias') return r.tipo === 'advertencia';
      if (filtroTipo === 'infracoes') return r.tipo === 'infracao';
      return true;
    })
    .sort((a, b) => {
      const tA = new Date(a.criadoEm).getTime();
      const tB = new Date(b.criadoEm).getTime();
      return ordenacao === 'recentes' ? tB - tA : tA - tB;
    });

  // Ação do assistente rápido
  const handleAssistenteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistenteInput.trim()) return;

    const termo = assistenteInput.trim().toLowerCase();
    const alunoEncontrado = alunos.find((a) => a.nome.toLowerCase().includes(termo));

    if (alunoEncontrado) {
      showToast(`Abrindo perfil de ${alunoEncontrado.nome}...`);
      onOpenAluno(alunoEncontrado.id);
    } else if (termo.includes('vistoria')) {
      onNavigate('vistoria');
    } else if (termo.includes('advertencia') || termo.includes('advertência')) {
      onOpenAdvertencia();
    } else if (termo.includes('escala')) {
      onNavigate('escalas');
    } else {
      showToast(`Buscando por "${assistenteInput}" no quadro geral de alunos.`);
      onNavigate('alunos');
    }
    setAssistenteInput('');
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full">
      {/* ============================================================== */}
      {/* 4.B & 4.C HEADER DE BOAS-VINDAS + INDICADORES SUPERIORES       */}
      {/* ============================================================== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1">
        {/* Lado Esquerdo: Saudação personalizada + 4 Indicadores compactos */}
        <div className="flex flex-col gap-3">
          <div>
            <BlurText
              text={`Olá, ${currentUser?.nome || 'Monitor'}`}
              as="h1"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)]"
            />
            <p className="text-xs sm:text-sm text-[var(--ink2)] font-medium">
              Acompanhamento central da disciplina, rotina e score dos dormitórios.
            </p>
          </div>

          {/* 4 Indicadores Compactos de Progresso (Ref: On-call shifts, Status pages, Alerts used, Reports) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-w-2xl">
            {/* 1. Vistorias do dia */}
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col justify-between gap-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink2)]">
                <span>Vistorias</span>
                <span className="text-[var(--ink)] font-bold">{pctVistorias}%</span>
              </div>
              <ProgressBar value={pctVistorias} max={100} className="h-1.5" />
              <span className="text-[10px] text-[var(--ink2)] font-medium">
                {vistoriasHoje.length} de {quartos.length || 2} quartos
              </span>
            </div>

            {/* 2. Meta do Passeio */}
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col justify-between gap-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink2)]">
                <span>Meta passeio</span>
                <span className="text-[var(--pri-text)] font-bold">{pctRegulares}%</span>
              </div>
              <ProgressBar value={pctRegulares} max={100} className="h-1.5" />
              <span className="text-[10px] text-[var(--ink2)] font-medium">
                Média 4,2 pts/dia
              </span>
            </div>

            {/* 3. Escalas ativas */}
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col justify-between gap-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink2)]">
                <span>Escalas</span>
                <span className="text-[var(--ok)] font-bold">100%</span>
              </div>
              <ProgressBar value={100} max={100} className="h-1.5" />
              <span className="text-[10px] text-[var(--ink2)] font-medium">
                Cozinha & Dormitório
              </span>
            </div>

            {/* 4. Conformidade */}
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col justify-between gap-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink2)]">
                <span>Conformidade</span>
                <span className="text-[var(--ink)] font-bold">{100 - pctDisciplina}%</span>
              </div>
              <ProgressBar value={100 - pctDisciplina} max={100} className="h-1.5" />
              <span className="text-[10px] text-[var(--ink2)] font-medium">
                {totalAlunos - alunosDisciplina.length} regulares
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: 3 KPIs Numéricos Destacados com Variação (Ref: 38, 26, 103) */}
        <div className="flex items-center gap-4 sm:gap-6 border-t xl:border-t-0 pt-3 xl:pt-0 border-[var(--line)]">
          {/* KPI 1: Score Médio */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--ok-soft)] text-[var(--ok)] flex items-center justify-center font-bold text-xs shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-[var(--ink)] leading-none">
                {scoreMedio}
              </div>
              <span className="text-[11px] font-medium text-[var(--ink2)] block mt-0.5">
                Score médio alunos
              </span>
            </div>
          </div>

          {/* KPI 2: Alunos Regulares */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--pri-soft)] text-[var(--pri-text)] flex items-center justify-center font-bold text-xs shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-[var(--ink)] leading-none">
                {alunosRegulares.length}
              </div>
              <span className="text-[11px] font-medium text-[var(--ink2)] block mt-0.5">
                Aptos ao passeio
              </span>
            </div>
          </div>

          {/* KPI 3: Ocorrências no Mês */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--warn-soft)] text-[var(--warn)] flex items-center justify-center font-bold text-xs shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-[var(--ink)] leading-none">
                {advertencias.length + infracoes.length}
              </div>
              <span className="text-[11px] font-medium text-[var(--ink2)] block mt-0.5">
                Ocorrências totais
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ÁREA CENTRAL (3 COLUNAS): RESUMO | GRÁFICO | CARD LATERAL      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 4.D PAINEL DE RESUMO (ESQUERDA - 3 colunas) */}
        <div className="card lg:col-span-3 p-4 sm:p-5 bg-[var(--surface)] border border-[var(--line)] flex flex-col justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] tracking-tight">
                Resumo de Conduta
              </h3>
              <span className="text-[10px] uppercase font-bold text-[var(--ink2)] px-2 py-0.5 rounded-full bg-[var(--surface2)]">
                Status
              </span>
            </div>

            {/* Categorias com indicadores coloridos e badges */}
            <div className="flex flex-col gap-2.5">
              {/* Categoria 1: Regulares / Elegíveis */}
              <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--ok)] shrink-0" />
                  <span className="text-xs font-semibold text-[var(--ink)]">Regulares</span>
                </div>
                <span className="text-xs font-extrabold text-[var(--ok)] bg-[var(--ok-soft)] px-2 py-0.5 rounded-md tabular-nums">
                  {alunosRegulares.length}
                </span>
              </div>

              {/* Categoria 2: Em Acompanhamento / Risco */}
              <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--warn)] shrink-0" />
                  <span className="text-xs font-semibold text-[var(--ink)]">Em risco</span>
                </div>
                <span className="text-xs font-extrabold text-[var(--warn)] bg-[var(--warn-soft)] px-2 py-0.5 rounded-md tabular-nums">
                  {alunosEmRisco.length}
                </span>
              </div>

              {/* Categoria 3: Em Disciplina */}
              <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--disc)] shrink-0" />
                  <span className="text-xs font-semibold text-[var(--ink)]">De disciplina</span>
                </div>
                <span className="text-xs font-extrabold text-[var(--disc)] bg-[var(--disc-soft)] px-2 py-0.5 rounded-md tabular-nums">
                  {alunosDisciplina.length}
                </span>
              </div>
            </div>
          </div>

          {/* Nota de rodapé contextual com ícone pequeno (Ref da imagem) */}
          <div className="pt-3 border-t border-[var(--line)] flex items-start gap-2 text-[11px] text-[var(--ink2)] leading-relaxed">
            <Info className="w-3.5 h-3.5 text-[var(--info)] shrink-0 mt-0.5" />
            <span>
              Média mínima calculada com base na meta proporcional do passeio ({totalAlunos} alunos ativos).
            </span>
          </div>
        </div>

        {/* 4.E GRÁFICO PRINCIPAL CENTRAL (6 colunas) */}
        <div className="card lg:col-span-6 p-4 sm:p-5 bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
          <CrmInteractiveChart />
        </div>

        {/* 4.F CARD LATERAL DE INFORMAÇÕES (DIREITA - 3 colunas) */}
        {/* No CRM ICEVES: Card com a identidade Gold/Floresta do Design System! */}
        <div className="card lg:col-span-3 p-5 bg-[var(--gold)] text-white border-0 shadow-md flex flex-col justify-between gap-4 relative overflow-hidden">
          {/* Fundo decorativo sutil */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

          <div>
            {/* Cabeçalho do Card com botão circular de ação ↗ */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[var(--pri)]">
                Elegibilidade
              </span>
              <button
                onClick={() => onNavigate('alunos')}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
                title="Ver lista completa de elegibilidade"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-extrabold tracking-tight mb-2 text-white">
              Passeio do Mês
            </h3>
            <p className="text-xs text-white/80 leading-relaxed mb-4">
              Critérios oficiais: pontuação diária mínima de 4,0 pontos, presença de 75% e zero infrações ativas.
            </p>

            {/* 2 Mini-cards flutuantes internos (Ref: Priority 3, Thread 1) */}
            <div className="flex flex-col gap-2">
              <div className="p-2.5 rounded-xl bg-white text-[var(--ink)] flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold">Alunos aptos</span>
                <span className="w-6 h-6 rounded-full bg-[var(--ok)] text-white text-xs font-extrabold flex items-center justify-center tabular-nums">
                  {alunosRegulares.length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 text-[var(--ink)] flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold">Com pendência</span>
                <span className="w-6 h-6 rounded-full bg-[var(--bad)] text-white text-xs font-extrabold flex items-center justify-center tabular-nums">
                  {alunosEmRisco.length + alunosDisciplina.length}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-white/70 font-medium">
            Meta atual: <strong>4,0 pontos/dia</strong>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO INFERIOR (3 COLUNAS): REGISTROS | ESTATÍSTICAS | CHAT     */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 4.G REGISTROS ATIVOS E OCORRÊNCIAS (ESQUERDA - 5 colunas) */}
        <div className="card lg:col-span-5 p-4 sm:p-5 bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between gap-3">
          <div>
            {/* Header com título e 2 seletores/filtros (Ref: Newest ⌵, All ⌵) */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] tracking-tight">
                Registros Ativos
              </h3>
              <div className="flex items-center gap-1.5">
                {/* Dropdown de Ordenação */}
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as any)}
                  className="text-[11px] bg-[var(--surface2)] border border-[var(--line)] rounded-lg px-2 py-1 font-semibold text-[var(--ink)] cursor-pointer focus:outline-none"
                >
                  <option value="recentes">Mais recentes</option>
                  <option value="antigos">Mais antigos</option>
                </select>

                {/* Filtro de Tipo */}
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as any)}
                  className="text-[11px] bg-[var(--surface2)] border border-[var(--line)] rounded-lg px-2 py-1 font-semibold text-[var(--ink)] cursor-pointer focus:outline-none"
                >
                  <option value="todos">Todos</option>
                  <option value="advertencias">Advertências</option>
                  <option value="infracoes">Infrações</option>
                </select>
              </div>
            </div>

            {/* Cards Horizontais Compactos (Ref: Active Incidents) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {registrosFiltrados.slice(0, 2).map((reg) => (
                <div
                  key={reg.id}
                  onClick={() => onOpenAluno(reg.alunoId)}
                  className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface2)] hover:border-[var(--pri)] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
                >
                  <div>
                    {/* Status Badge + Código */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          reg.tipo === 'infracao'
                            ? 'bg-[var(--bad-soft)] text-[var(--bad)]'
                            : 'bg-[var(--warn-soft)] text-[var(--warn)]'
                        }`}
                      >
                        {reg.statusLabel}
                      </span>
                      <span className="text-[10px] text-[var(--ink2)] font-mono">
                        {reg.codigo}
                      </span>
                    </div>

                    {/* Descrição resumida */}
                    <p className="text-xs font-medium text-[var(--ink)] line-clamp-2 leading-snug">
                      {reg.descricao}
                    </p>
                  </div>

                  {/* Avatar + Nome + Dormitório */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--pri-soft)] text-[var(--pri-text)] font-bold text-[10px] flex items-center justify-center shrink-0">
                      {reg.alunoNome.charAt(0)}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-xs text-[var(--ink)] block truncate group-hover:text-[var(--pri-text)] transition-colors">
                        {reg.alunoNome}
                      </span>
                      <span className="text-[10px] text-[var(--ink2)] block truncate">
                        {reg.quartoNome}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {registrosFiltrados.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-[var(--ink2)]">
                  Nenhuma ocorrência registrada no período selecionado.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('alunos')}
            className="text-xs font-bold text-[var(--pri-text)] hover:underline self-start cursor-pointer pt-1"
          >
            Ver histórico completo de ocorrências →
          </button>
        </div>

        {/* 4.H PAINEL DE ESTATÍSTICAS PROPORCIONAIS (CENTRO - 3 colunas) */}
        <div className="card lg:col-span-3 p-4 sm:p-5 bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] tracking-tight">
              Estatísticas
            </h3>
            <button
              onClick={() => onNavigate('alunos')}
              className="w-6 h-6 rounded-full bg-[var(--surface2)] hover:bg-[var(--line)] flex items-center justify-center text-[var(--ink2)] cursor-pointer transition-colors"
              title="Detalhes das estatísticas"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gráfico Circular Proporcional (Ref: 64% Investigating, 26% Triage, 15% Fixing) */}
          <div className="relative py-2 flex items-center justify-center min-h-[140px]">
            {/* Círculo Principal: Regulares (Maior) */}
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[var(--pri)] text-[var(--pri-ink)] flex flex-col items-center justify-center shadow-md border-2 border-[var(--surface)] z-10">
                <span className="text-xl font-extrabold tabular-nums leading-none">
                  {pctRegulares}%
                </span>
                <span className="text-[9px] font-bold uppercase tracking-tight mt-0.5">
                  Regulares
                </span>
              </div>

              {/* Círculo Secundário Sobreposto: Em Risco */}
              <div className="absolute -bottom-2 -right-4 w-16 h-16 rounded-full bg-[var(--warn)] text-white flex flex-col items-center justify-center shadow-md border-2 border-[var(--surface)] z-20">
                <span className="text-sm font-extrabold tabular-nums leading-none">
                  {pctRisco}%
                </span>
                <span className="text-[8px] font-semibold uppercase mt-0.5">
                  Risco
                </span>
              </div>

              {/* Círculo Terciário Sobreposto: Disciplina */}
              <div className="absolute -top-1 -right-3 w-12 h-12 rounded-full bg-[var(--disc)] text-white flex flex-col items-center justify-center shadow-md border-2 border-[var(--surface)] z-30">
                <span className="text-xs font-extrabold tabular-nums leading-none">
                  {pctDisciplina}%
                </span>
                <span className="text-[7px] font-semibold uppercase">
                  Disc.
                </span>
              </div>
            </div>
          </div>

          {/* Rótulos do Rodapé */}
          <div className="flex items-center justify-around text-[10px] text-[var(--ink2)] font-semibold pt-2 border-t border-[var(--line)]">
            <span className="text-[var(--pri-text)] font-bold">● {pctRegulares}% Regulares</span>
            <span className="text-[var(--warn)] font-bold">● {pctRisco}% Em risco</span>
            <span className="text-[var(--disc)] font-bold">● {pctDisciplina}% Disciplina</span>
          </div>
        </div>

        {/* 4.I PAINEL DE ASSISTENTE / AÇÕES RÁPIDAS (DIREITA - 4 colunas) */}
        {/* Ref: Hi, Caroline 👋 How can I help you? + 4 buttons + Ask something input */}
        <div className="card lg:col-span-4 p-4 sm:p-5 bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between gap-3">
          <div>
            <div className="mb-2.5">
              <span className="text-xs font-semibold text-[var(--ink2)] flex items-center gap-1">
                Olá, {currentUser?.nome?.split(' ')[0] || 'Monitor'} <span className="text-sm">👋</span>
              </span>
              <h3 className="font-extrabold text-base text-[var(--ink)] tracking-tight">
                Como posso ajudar hoje?
              </h3>
            </div>

            {/* Grid 2x2 de Ações Rápidas com ícones (Ref: Text assistance, Automation, Scheduling, Smart response) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Ação 1: Lançar Vistoria */}
              <button
                type="button"
                onClick={() => onNavigate('vistoria')}
                className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] hover:border-[var(--pri)] hover:bg-[var(--pri-soft)] transition-all flex items-center gap-2 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--surface)] flex items-center justify-center text-[var(--pri-text)] shrink-0 shadow-2xs">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[var(--ink)] leading-tight group-hover:text-[var(--pri-text)]">
                  Lançar vistoria
                </span>
              </button>

              {/* Ação 2: Lançar Advertência */}
              <button
                type="button"
                onClick={() => onOpenAdvertencia()}
                className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] hover:border-[var(--warn)] hover:bg-[var(--warn-soft)] transition-all flex items-center gap-2 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--surface)] flex items-center justify-center text-[var(--warn)] shrink-0 shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[var(--ink)] leading-tight group-hover:text-[var(--warn)]">
                  Advertência
                </span>
              </button>

              {/* Ação 3: Ver Escalas */}
              <button
                type="button"
                onClick={() => onNavigate('escalas')}
                className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] hover:border-[var(--ok)] hover:bg-[var(--ok-soft)] transition-all flex items-center gap-2 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--surface)] flex items-center justify-center text-[var(--ok)] shrink-0 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[var(--ink)] leading-tight group-hover:text-[var(--ok)]">
                  Ver escalas
                </span>
              </button>

              {/* Ação 4: Ajustar Pontos / Alunos */}
              <button
                type="button"
                onClick={() => onNavigate('alunos')}
                className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] hover:border-[var(--pri)] hover:bg-[var(--pri-soft)] transition-all flex items-center gap-2 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--surface)] flex items-center justify-center text-[var(--pri-text)] shrink-0 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[var(--ink)] leading-tight group-hover:text-[var(--pri-text)]">
                  Ajustar pontos
                </span>
              </button>
            </div>
          </div>

          {/* Campo de Entrada Inferior (Ref: Ask something... with sparkle/send icon) */}
          <form onSubmit={handleAssistenteSubmit} className="relative mt-1">
            <input
              type="text"
              value={assistenteInput}
              onChange={(e) => setAssistenteInput(e.target.value)}
              placeholder="Buscar aluno ou ação rápida..."
              className="f text-xs pr-10 bg-[var(--surface2)] border-[var(--line)] placeholder:text-[var(--ink2)]"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 p-1.5 rounded-lg text-[var(--ink2)] hover:text-[var(--pri-text)] hover:bg-[var(--surface)] cursor-pointer transition-colors"
              title="Executar busca ou ação"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--pri-text)]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
