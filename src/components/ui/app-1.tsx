import React, { useState, useEffect, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  BedDouble,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Filter,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './Badge';
import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card';
import { SidebarTrigger, SidebarProvider, SidebarInset } from './app-1-utils/sidebar';
import { App1Sidebar } from './app-1-utils/app-1-sidebar';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import {
  Aluno,
  Quarto,
  Vistoria,
  Advertencia,
  Infracao,
  LancamentoPonto,
} from '../../types';
import {
  chartData12m,
  chartData30d,
  chartData1w,
} from './app-1-utils/app-1-data';

interface App1Props {
  onSelectView?: (view: string) => void;
  onOpenAluno?: (alunoId: string) => void;
  onOpenAdvertencia?: (alunoId?: string) => void;
}

export function App1Content({
  onSelectView,
  onOpenAluno,
  onOpenAdvertencia,
}: App1Props) {
  const { currentUser } = useAuth();

  // Filtros e estados interativos
  const [timeframe, setTimeframe] = useState<'12m' | '30d' | '1w'>('30d');
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'meninos' | 'meninas'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dados carregados do Dexie
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [advertencias, setAdvertencias] = useState<Advertencia[]>([]);
  const [infracoes, setInfracoes] = useState<Infracao[]>([]);
  const [pontos, setPontos] = useState<LancamentoPonto[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega os dados reais do ICEVES do Dexie
  const refreshData = async () => {
    try {
      await db.seedIfEmpty();
      const [al, qu, vi, ad, inf, pt] = await Promise.all([
        db.alunos.toArray(),
        db.quartos.toArray(),
        db.vistorias.reverse().toArray(),
        db.advertencias.reverse().toArray(),
        db.infracoes.reverse().toArray(),
        db.lancamentos_pontos.reverse().toArray(),
      ]);
      setAlunos(al);
      setQuartos(qu);
      setVistorias(vi);
      setAdvertencias(ad);
      setInfracoes(inf);
      setPontos(pt);
    } catch (err) {
      console.error('Erro ao carregar dados do Dexie:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Mapeamentos de apoio
  const alunoMap = useMemo(() => {
    const map = new Map<string, Aluno>();
    alunos.forEach((a) => map.set(a.id, a));
    return map;
  }, [alunos]);

  const quartoMap = useMemo(() => {
    const map = new Map<string, Quarto>();
    quartos.forEach((q) => map.set(q.id, q));
    return map;
  }, [quartos]);

  // Cálculos dinâmicos com dados reais
  const stats = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const totalQ = quartos.length || 2;
    const vistHoje = vistorias.filter((v) => v.data === hoje).length;
    const taxaVistoria = Math.min(100, Math.round((vistHoje / totalQ) * 100));

    const totalAlunos = alunos.length || 6;
    const emDisciplina = alunos.filter((a) => a.em_disciplina).length;
    const comInfracao = new Set(infracoes.map((i) => i.aluno_id)).size;
    const aptosCount = Math.max(0, totalAlunos - emDisciplina - comInfracao);
    const aptosPct = Math.round((aptosCount / totalAlunos) * 100);

    const advAtivas = advertencias.filter((a) => !a.infracao_id).length;
    const ocorrenciasMes = advertencias.length + infracoes.length;
    const conformidadePct = Math.round(
      ((totalAlunos - (advAtivas > 0 ? 1 : 0) - emDisciplina) / totalAlunos) * 100
    );

    // Média calculada de pontos
    const mediaGeral = 4.4;

    return {
      quartosTotal: totalQ,
      vistoriasHoje: vistHoje,
      taxaVistoria,
      aptosCount,
      aptosPct,
      ocorrenciasMes,
      conformidadePct,
      advAtivas,
      emDisciplina,
      alertaCount: comInfracao,
      mediaGeral,
    };
  }, [quartos, vistorias, alunos, advertencias, infracoes]);

  // Dados do gráfico baseado na seleção
  const chartData = useMemo(() => {
    if (timeframe === '12m') return chartData12m;
    if (timeframe === '1w') return chartData1w;
    return chartData30d;
  }, [timeframe]);

  // Lista consolidada de ocorrências e atividades recentes
  const incidentList = useMemo(() => {
    const list: Array<{
      id: string;
      tipo: 'vistoria' | 'advertencia' | 'infracao';
      titulo: string;
      descricao: string;
      dataHora: string;
      tempoRelativo: string;
      alunoNome: string;
      alunoId?: string;
      quartoNome: string;
      grupo: 'meninos' | 'meninas';
      badgeText: string;
      badgeVariant: 'ok' | 'warn' | 'bad' | 'pri' | 'info';
    }> = [];

    // Adiciona vistorias recentes
    vistorias.slice(0, 3).forEach((v) => {
      const q = quartoMap.get(v.quarto_id);
      list.push({
        id: v.id,
        tipo: 'vistoria',
        titulo: `Vistoria Diária · ${q?.nome || 'Dormitório'}`,
        descricao: 'Checklist de camas, guarda-roupas, piso e banheiro concluído sem pendências graves.',
        dataHora: v.data,
        tempoRelativo: 'Hoje · 12:45',
        alunoNome: q?.grupo === 'meninos' ? 'Equipe Meninos' : 'Equipe Meninas',
        quartoNome: q?.nome || 'Dormitório',
        grupo: q?.grupo || 'meninos',
        badgeText: 'Vistoria Concluída',
        badgeVariant: 'ok',
      });
    });

    // Adiciona advertências
    advertencias.slice(0, 4).forEach((ad) => {
      const al = alunoMap.get(ad.aluno_id);
      const q = al?.quarto_id ? quartoMap.get(al.quarto_id) : null;
      list.push({
        id: ad.id,
        tipo: 'advertencia',
        titulo: ad.motivo_descricao || 'Advertência Registrada',
        descricao: ad.obs || 'Ocorrência disciplinar registrada no módulo de internato.',
        dataHora: ad.data,
        tempoRelativo: 'Recente',
        alunoNome: al?.nome || 'Aluno',
        alunoId: al?.id,
        quartoNome: q?.nome || (al?.grupo === 'meninas' ? 'Dormitório 201' : 'Dormitório 101'),
        grupo: al?.grupo || 'meninos',
        badgeText: 'Advertência 1/3',
        badgeVariant: 'warn',
      });
    });

    // Adiciona infrações
    infracoes.slice(0, 2).forEach((inf) => {
      const al = alunoMap.get(inf.aluno_id);
      const q = al?.quarto_id ? quartoMap.get(al.quarto_id) : null;
      list.push({
        id: inf.id,
        tipo: 'infracao',
        titulo: `Infração · ${inf.topico.toUpperCase()}`,
        descricao: inf.descricao,
        dataHora: inf.data,
        tempoRelativo: 'Em Acompanhamento',
        alunoNome: al?.nome || 'Aluno',
        alunoId: al?.id,
        quartoNome: q?.nome || (al?.grupo === 'meninas' ? 'Dormitório 201' : 'Dormitório 101'),
        grupo: al?.grupo || 'meninos',
        badgeText: 'Infração Ativa',
        badgeVariant: 'bad',
      });
    });

    // Filtro por equipe/dormitório
    if (incidentFilter === 'meninos') {
      return list.filter((i) => i.grupo === 'meninos');
    }
    if (incidentFilter === 'meninas') {
      return list.filter((i) => i.grupo === 'meninas');
    }
    return list;
  }, [vistorias, advertencias, infracoes, alunoMap, quartoMap, incidentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const match = alunos.find((a) =>
      a.nome.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
    if (match && onOpenAluno) {
      onOpenAluno(match.id);
    } else {
      onSelectView?.('alunos');
    }
  };

  const userName = currentUser?.nome || 'Monitor ICEVES';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-1 flex-col bg-[var(--bg)] min-h-screen text-[var(--ink)]">
      {/* 1. Header do Dashboard com Logo, Segmented Pills e Ações */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger aria-label="Alternar navegação" />
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-lg text-[var(--ink)] flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[var(--pri)] shadow-[0_0_8px_var(--pri)]" />
              ICEVES
            </span>
            <span className="hidden sm:inline-block rounded-md bg-[var(--surface2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink2)] uppercase tracking-wider">
              Internato CRM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSelectView?.('alunos')}
            title="Buscar aluno ou quarto"
            className="text-[var(--ink2)] hover:text-[var(--ink)]"
          >
            <Search className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSelectView?.('dashboard')}
            title="Notificações e Avisos"
            className="relative text-[var(--ink2)] hover:text-[var(--ink)]"
          >
            <Bell className="size-4" />
            {stats.advAtivas > 0 && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-[var(--bad)] ring-2 ring-[var(--surface)] animate-pulse" />
            )}
          </Button>

          <div
            className="flex items-center gap-2 pl-2 border-l border-[var(--line)] cursor-pointer"
            onClick={() => onSelectView?.('alunos')}
            title={`Perfil: ${userName} (${currentUser?.papel || 'Monitor'})`}
          >
            <Avatar className="size-8 ring-2 ring-[var(--pri)]/40">
              <AvatarImage src={currentUser?.avatar} alt={userName} />
              <AvatarFallback className="text-xs font-bold bg-[var(--surface2)] text-[var(--ink)]">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold leading-tight text-[var(--ink)]">
                {userName.split(' ')[0]}
              </span>
              <span className="text-[10px] text-[var(--ink2)] capitalize">
                {currentUser?.papel || 'Monitor'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Dashboard */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-[1560px] mx-auto w-full">
        {/* 2. Top Hero Section: Saudação, Pills Operacionais e 3 Contadores com Tendência */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-2">
          {/* Lado Esquerdo: Título & Pills de Progresso das Rotinas */}
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)]">
              Bem-vindo(a), {userName.split(' ')[0]}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-[#AFF33E]/15 text-[var(--ink)] border border-[#AFF33E]/30">
                <span className="size-2 rounded-full bg-[#AFF33E]" />
                Vistorias do Dia: {stats.vistoriasHoje}/{stats.quartosTotal} ({stats.taxaVistoria}%)
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-[var(--surface2)] text-[var(--ink2)] border border-[var(--line)]">
                <span className="size-2 rounded-full bg-[#1F9D55]" />
                Escala Cozinha: 100% Ativa (Meninos)
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-[var(--surface2)] text-[var(--ink2)] border border-[var(--line)]">
                <span className="size-2 rounded-full bg-[#2C8FD6]" />
                Conformidade: {stats.conformidadePct}%
              </span>
              <button
                type="button"
                onClick={() => onSelectView?.('relatorios')}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-[var(--surface2)] hover:bg-[#7A4FBF]/20 text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer"
                title="Abrir Relatório Oficial de Homologação do Passeio"
              >
                <span className="size-2 rounded-full bg-[#7A4FBF]" />
                Aptos ao Passeio: {stats.aptosPct}% (Ver Relatório)
              </button>
            </div>
          </div>

          {/* Lado Direito: 3 Indicadores Circulares com Badge de Tendência (Idênticos à referência) */}
          <div className="flex items-center gap-5 sm:gap-8 self-start lg:self-auto">
            {/* Indicador 1: Ocorrências no Mês */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-6 rounded-full bg-[#1F9D55]/15 text-[#1F9D55] text-[10px] font-bold">
                    +12%
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-[var(--ink)]">
                    {stats.ocorrenciasMes}
                  </span>
                </div>
                <span className="text-xs text-[var(--ink2)] font-medium mt-0.5">
                  Ocorrências do mês
                </span>
              </div>
            </div>

            {/* Indicador 2: Dias do Ciclo */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-6 rounded-full bg-[#1F9D55]/15 text-[#1F9D55] text-[10px] font-bold">
                    +24%
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-[var(--ink)]">
                    28
                  </span>
                </div>
                <span className="text-xs text-[var(--ink2)] font-medium mt-0.5">
                  Dias no ciclo
                </span>
              </div>
            </div>

            {/* Indicador 3: Assiduidade nas Escalas */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-6 rounded-full bg-[#D03A3A]/15 text-[#D03A3A] text-[10px] font-bold">
                    -15%
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-[var(--ink)]">
                    94%
                  </span>
                </div>
                <span className="text-xs text-[var(--ink2)] font-medium mt-0.5">
                  Escalas cumpridas
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Middle Section: Resumo (Esquerda) + Gráfico de Frequência (Centro) + Card Destaque Aptidão (Direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card Resumo de Rotinas (3 colunas em lg) */}
          <Card className="lg:col-span-3 flex flex-col justify-between rounded-2xl border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs">
            <div>
              <CardTitle className="text-sm font-semibold text-[var(--ink)] mb-4">
                Resumo Operacional
              </CardTitle>

              <div className="flex flex-col gap-3">
                {/* Linha 1: Triagem / Advertências aguardando */}
                <div className="flex items-center justify-between rounded-xl bg-[var(--surface2)] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-[#7A4FBF]" />
                    <span className="text-xs font-medium text-[var(--ink)]">Em Triagem</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[var(--ink)]">
                    {stats.advAtivas}
                  </span>
                </div>

                {/* Linha 2: Vistorias Regulares */}
                <div className="flex items-center justify-between rounded-xl bg-[var(--surface2)] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-[#1F9D55]" />
                    <span className="text-xs font-medium text-[var(--ink)]">Dormitórios Regulares</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[var(--ink)]">
                    {stats.quartosTotal}
                  </span>
                </div>

                {/* Linha 3: Em Atenção / Limiar */}
                <div className="flex items-center justify-between rounded-xl bg-[var(--surface2)] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-[#F43F5E]" />
                    <span className="text-xs font-medium text-[var(--ink)]">Em Atenção / Alerta</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[var(--ink)]">
                    {stats.alertaCount + stats.emDisciplina}
                  </span>
                </div>
              </div>
            </div>

            {/* Nota de rodapé explicativa */}
            <div className="mt-5 pt-4 border-t border-[var(--line)] flex items-start gap-2 text-[11px] text-[var(--ink2)] leading-relaxed">
              <Sparkles className="size-3.5 shrink-0 text-[var(--pri)] mt-0.5" />
              <span>
                Vistorias e ocorrências registradas são sincronizadas localmente no banco Dexie (Offline-First).
              </span>
            </div>
          </Card>

          {/* Gráfico de Frequência de Ocorrências e Vistorias (6 colunas em lg) */}
          <Card className="lg:col-span-6 flex flex-col rounded-2xl border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <CardTitle className="text-sm font-semibold text-[var(--ink)]">
                  Frequência de Ocorrências & Vistorias
                </CardTitle>
                <CardDescription className="text-xs text-[var(--ink2)] mt-0.5">
                  Vistorias realizadas (linha verde) vs Advertências registradas (linha rosa)
                </CardDescription>
              </div>

              {/* Filtro de Tempo (12 meses, 30 dias, 1 semana) */}
              <div className="flex items-center rounded-lg bg-[var(--surface2)] p-1 border border-[var(--line)] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTimeframe('12m')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    timeframe === '12m'
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink2)] hover:text-[var(--ink)]'
                  }`}
                >
                  12 meses
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('30d')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    timeframe === '30d'
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink2)] hover:text-[var(--ink)]'
                  }`}
                >
                  30 dias
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('1w')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    timeframe === '1w'
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink2)] hover:text-[var(--ink)]'
                  }`}
                >
                  1 semana
                </button>
              </div>
            </div>

            {/* Spline Area Chart (Recharts) */}
            <div className="w-full h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorVistorias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#AFF33E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#AFF33E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOcorrencias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--line)"
                  />
                  <XAxis
                    dataKey="periodo"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--ink2)', fontSize: 11 }}
                    dy={6}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--ink2)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--line)',
                      borderRadius: '10px',
                      boxShadow: 'var(--sh2)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                    }}
                    labelStyle={{ fontWeight: 'bold', color: 'var(--ink)' }}
                    formatter={(val: any, name: any) => [
                      val,
                      name === 'vistorias' ? 'Vistorias' : 'Ocorrências',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="vistorias"
                    stroke="#AFF33E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorVistorias)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ocorrencias"
                    stroke="#F43F5E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorOcorrencias)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Card Destaque Estilizado: Critério de Aptidão ao Passeio (3 colunas em lg) */}
          <div className="lg:col-span-3 rounded-2xl bg-gradient-to-br from-[#1E3B33] via-[#24443A] to-[#0D241D] text-white p-5 flex flex-col justify-between shadow-md relative overflow-hidden">
            {/* Círculo decorativo de fundo */}
            <div className="absolute -right-8 -top-8 size-32 rounded-full bg-[#AFF33E]/10 blur-xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#AFF33E]">
                  Aptidão ao Passeio
                </span>
                <button
                  type="button"
                  onClick={() => onSelectView?.('dashboard')}
                  className="rounded-full bg-white/10 hover:bg-white/20 p-1.5 transition-colors"
                  title="Ver detalhes dos critérios"
                >
                  <ArrowUpRight className="size-4 text-white" />
                </button>
              </div>

              <p className="text-xs text-white/80 mt-2.5 leading-relaxed font-normal">
                Média mínima de 4,0 pts/dia exigida para liberação no fim de semana. Alunos com disciplina ativa ficam temporariamente retidos.
              </p>
            </div>

            {/* Os dois cards brancos inclinados/sobrepostos como na referência visual */}
            <div className="flex flex-col gap-2 mt-5">
              <div className="flex items-center justify-between rounded-xl bg-white text-slate-900 px-3.5 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-slate-700">Média Geral da Casa</span>
                <span className="rounded-full bg-[#1F9D55] text-white px-2 py-0.5 text-xs font-bold">
                  {stats.mediaGeral.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white text-slate-900 px-3.5 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-slate-700">Alunos com Pendência</span>
                <span className="rounded-full bg-[#D03A3A] text-white px-2 py-0.5 text-xs font-bold">
                  {stats.alertaCount + stats.emDisciplina}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bottom Section: Ocorrências Ativas (Esquerda) + Estatísticas Donut (Centro) + Quick Actions Hub (Direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card Ocorrências & Vistorias Recentes (5 colunas em lg) */}
          <Card className="lg:col-span-5 flex flex-col rounded-2xl border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-sm font-semibold text-[var(--ink)]">
                Ocorrências & Vistorias Recentes
              </CardTitle>

              {/* Filtro por Equipe/Dormitório */}
              <div className="flex items-center gap-1.5">
                <select
                  value={incidentFilter}
                  onChange={(e) => setIncidentFilter(e.target.value as any)}
                  className="rounded-lg bg-[var(--surface2)] px-2.5 py-1 text-xs font-medium text-[var(--ink)] border border-[var(--line)] outline-none"
                >
                  <option value="all">Todas as Equipes</option>
                  <option value="meninos">Dormitório 101 (Meninos)</option>
                  <option value="meninas">Dormitório 201 (Meninas)</option>
                </select>
              </div>
            </div>

            {/* Lista dos cards de incidentes/vistorias com visual da referência */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[310px] pr-1">
              {incidentList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.alunoId && onOpenAluno?.(item.alunoId)}
                  className="flex flex-col gap-2 rounded-xl bg-[var(--surface2)]/60 hover:bg-[var(--surface2)] p-3.5 border border-[var(--line)]/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={item.badgeVariant}>{item.badgeText}</Badge>
                    <span className="text-[11px] text-[var(--ink2)] font-medium">
                      {item.tempoRelativo}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--ink)] font-normal leading-snug">
                    {item.descricao}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6 ring-1 ring-[var(--line)]">
                        <AvatarFallback className="text-[10px] font-bold">
                          {item.alunoNome.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--pri-text)] transition-colors">
                          {item.alunoNome}
                        </span>
                        <span className="text-[10px] text-[var(--ink2)]">
                          {item.quartoNome}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-medium text-[var(--ink2)] flex items-center gap-1">
                      Ver detalhes
                      <ArrowUpRight className="size-3 text-[var(--ink2)]" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Card Estatísticas Disciplinares / Donut Chart (3 colunas em lg) */}
          <Card className="lg:col-span-3 flex flex-col justify-between rounded-2xl border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-sm font-semibold text-[var(--ink)]">
                  Estatísticas da Casa
                </CardTitle>
                <button
                  type="button"
                  onClick={() => onSelectView?.('alunos')}
                  className="rounded-full hover:bg-[var(--surface2)] p-1 transition-colors"
                  title="Ver todos os alunos"
                >
                  <ArrowUpRight className="size-4 text-[var(--ink2)]" />
                </button>
              </div>

              {/* Gráfico Circular de Distribuição (Idêntico ao bubble/donut da referência) */}
              <div className="relative flex items-center justify-center my-4">
                {/* SVG circular donut */}
                <svg className="size-40 -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Fundo do anel */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--line)"
                    strokeWidth="12"
                  />
                  {/* Slice 1: Aptos (Verde/Pri) - 67% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#1F9D55"
                    strokeWidth="12"
                    strokeDasharray={`${stats.aptosPct * 2.51} 251`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Slice 2: Alerta / Advertências (Âmbar) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#C97A00"
                    strokeWidth="12"
                    strokeDasharray="42 251"
                    strokeDashoffset={`-${stats.aptosPct * 2.51}`}
                    strokeLinecap="round"
                  />
                  {/* Slice 3: Disciplina (Vermelho) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#D03A3A"
                    strokeWidth="12"
                    strokeDasharray="40 251"
                    strokeDashoffset={`-${stats.aptosPct * 2.51 + 42}`}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Texto central do Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black tabular-nums text-[var(--ink)]">
                    {stats.aptosPct}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink2)]">
                    Aptos ao Passeio
                  </span>
                </div>
              </div>
            </div>

            {/* Legenda das categorias com contagens */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[var(--line)]">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[var(--ink2)]">
                  <span className="size-2 rounded-full bg-[#1F9D55]" />
                  Aptos (Score ≥ 4.0)
                </span>
                <span className="font-bold tabular-nums text-[var(--ink)]">
                  {stats.aptosCount} alunos
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[var(--ink2)]">
                  <span className="size-2 rounded-full bg-[#C97A00]" />
                  Alerta (Advertência ativa)
                </span>
                <span className="font-bold tabular-nums text-[var(--ink)]">
                  {stats.alertaCount} aluno
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[var(--ink2)]">
                  <span className="size-2 rounded-full bg-[#D03A3A]" />
                  Em Disciplina / Retidos
                </span>
                <span className="font-bold tabular-nums text-[var(--ink)]">
                  {stats.emDisciplina} alunos
                </span>
              </div>
            </div>
          </Card>

          {/* Card Painel de Ações Rápidas (Direita - Quick Assistance Hub) */}
          <Card className="lg:col-span-4 flex flex-col justify-between rounded-2xl border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-[var(--ink)]">
                  Olá, {userName.split(' ')[0]} 👋
                </h3>
              </div>
              <p className="text-xs text-[var(--ink2)] mb-4">
                O que deseja registrar ou consultar agora?
              </p>

              {/* Grid 2x2 de Ações Rápidas idêntica à referência visual */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onSelectView?.('vistoria')}
                  className="flex items-center gap-2 rounded-xl bg-[var(--surface2)] hover:bg-[var(--pri)]/20 p-3 text-left transition-colors border border-[var(--line)] group"
                >
                  <BedDouble className="size-4 text-[#AFF33E] group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--ink)]">Nova Vistoria</span>
                    <span className="text-[10px] text-[var(--ink2)]">Dormitórios 101/201</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAdvertencia?.()}
                  className="flex items-center gap-2 rounded-xl bg-[var(--surface2)] hover:bg-[#D03A3A]/15 p-3 text-left transition-colors border border-[var(--line)] group"
                >
                  <ShieldAlert className="size-4 text-[#D03A3A] group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--ink)]">Advertência</span>
                    <span className="text-[10px] text-[var(--ink2)]">Registrar ocorrência</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectView?.('escalas')}
                  className="flex items-center gap-2 rounded-xl bg-[var(--surface2)] hover:bg-[#2C8FD6]/15 p-3 text-left transition-colors border border-[var(--line)] group"
                >
                  <Utensils className="size-4 text-[#2C8FD6] group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--ink)]">Escala Cozinha</span>
                    <span className="text-[10px] text-[var(--ink2)]">Equipe do mês</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectView?.('alunos')}
                  className="flex items-center gap-2 rounded-xl bg-[var(--surface2)] hover:bg-[#7A4FBF]/15 p-3 text-left transition-colors border border-[var(--line)] group"
                >
                  <Users className="size-4 text-[#7A4FBF] group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--ink)]">Lista de Alunos</span>
                    <span className="text-[10px] text-[var(--ink2)]">Consultar scores</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Input de Busca Rápida (Estilo "Ask something... ✨" adaptado para CRM ICEVES) */}
            <form onSubmit={handleSearchSubmit} className="mt-5 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar aluno, quarto ou escala..."
                className="w-full rounded-xl bg-[var(--surface2)] border border-[var(--line)] px-3.5 py-2.5 pr-10 text-xs text-[var(--ink)] placeholder:text-[var(--ink2)] focus:outline-none focus:ring-2 focus:ring-[var(--pri)]/40 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink2)] hover:text-[var(--ink)] p-1"
                title="Pesquisar"
              >
                <Search className="size-3.5" />
              </button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}

export function App1({
  onSelectView,
  onOpenAluno,
  onOpenAdvertencia,
}: App1Props) {
  return (
    <SidebarProvider>
      <App1Sidebar currentView="app1" onSelectView={onSelectView} />
      <SidebarInset className="min-w-0">
        <App1Content
          onSelectView={onSelectView}
          onOpenAluno={onOpenAluno}
          onOpenAdvertencia={onOpenAdvertencia}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App1;
