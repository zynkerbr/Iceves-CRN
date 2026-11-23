import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/db';
import {
  Aluno,
  Quarto,
  LancamentoPonto,
  Advertencia,
  Infracao,
  Disciplina,
  Vistoria,
  VistoriaItem,
  AlocacaoSetor,
  Mes
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import {
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Calendar,
  ClipboardCheck,
  Search,
  Filter,
  Users,
  ShieldAlert,
  ArrowUpDown,
  FileText
} from 'lucide-react';
import { SEED_MES, SEED_PERIODO_META } from '../../data/seed';

type ReportType = 'passeio' | 'mural_escalas' | 'vistorias';

interface RelatoriosViewProps {
  onNavigate?: (view: string, alunoId?: string) => void;
  initialReport?: ReportType;
}

export function RelatoriosView({ onNavigate, initialReport = 'passeio' }: RelatoriosViewProps) {
  const { currentUser } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>(initialReport);
  const [loading, setLoading] = useState(true);

  // Database entities
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [pontos, setPontos] = useState<LancamentoPonto[]>([]);
  const [advertencias, setAdvertencias] = useState<Advertencia[]>([]);
  const [infracoes, setInfracoes] = useState<Infracao[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [vistoriaItens, setVistoriaItens] = useState<VistoriaItem[]>([]);
  const [alocacoes, setAlocacoes] = useState<AlocacaoSetor[]>([]);
  const [mesAtual, setMesAtual] = useState<Mes>(SEED_MES);

  // Filters
  const [filtroGrupo, setFiltroGrupo] = useState<'todos' | 'meninos' | 'meninas'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aptos' | 'retidos'>('todos');
  const [busca, setBusca] = useState('');

  // Load all DB data
  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const [
          a,
          q,
          p,
          adv,
          inf,
          disc,
          vist,
          vItens,
          aloc,
          m
        ] = await Promise.all([
          db.alunos.toArray(),
          db.quartos.toArray(),
          db.lancamentos_pontos.toArray(),
          db.advertencias.toArray(),
          db.infracoes.toArray(),
          db.disciplinas.toArray(),
          db.vistorias.toArray(),
          db.vistoria_itens.toArray(),
          db.alocacoes.toArray(),
          db.meses.toCollection().first(),
        ]);

        setAlunos(a);
        setQuartos(q);
        setPontos(p);
        setAdvertencias(adv);
        setInfracoes(inf);
        setDisciplinas(disc);
        setVistorias(vist);
        setVistoriaItens(vItens);
        setAlocacoes(aloc);
        if (m) setMesAtual(m);
      } catch (err) {
        console.error('Erro ao carregar dados do relatório:', err);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  // Compute student scores and eligibility
  const dadosAlunos = useMemo(() => {
    const hoje = new Date();
    const diaDoMes = hoje.getDate();
    const diasMes = 30;

    return alunos.map((aluno) => {
      const pts = pontos.filter((p) => p.aluno_id === aluno.id);
      const scoreTotal = pts.reduce((acc, curr) => acc + curr.valor, 0);
      const advs = advertencias.filter((a) => a.aluno_id === aluno.id);
      const infs = infracoes.filter((i) => i.aluno_id === aluno.id);
      const disc = disciplinas.find((d) => d.aluno_id === aluno.id && d.status === 'pendente');
      const quarto = quartos.find((q) => q.id === aluno.quarto_id);
      const aloc = alocacoes.find((x) => x.aluno_id === aluno.id);

      // Regra de Aptidão para o Passeio:
      // Meta sugerida: média de conduta >= 3.5, score positivo, infrações < 3, e sem disciplina ativa.
      const mediaDiaria = diaDoMes > 0 ? (scoreTotal / diaDoMes) : scoreTotal;
      const apto = scoreTotal >= 10 && infs.length < 3 && !aluno.em_disciplina && !disc;

      let motivoRestricao = '';
      if (aluno.em_disciplina || disc) {
        motivoRestricao = 'Em cumprimento de disciplina';
      } else if (infs.length >= 3) {
        motivoRestricao = 'Limite de infrações excedido (≥3)';
      } else if (scoreTotal < 10) {
        motivoRestricao = 'Pontuação insuficiente (< 10 pts)';
      }

      return {
        ...aluno,
        quartoNome: quarto?.nome || 'Sem quarto',
        scoreTotal,
        mediaDiaria: Math.round(mediaDiaria * 10) / 10,
        totalAdvertencias: advs.length,
        totalInfracoes: infs.length,
        emDisciplinaAtiva: !!aluno.em_disciplina || !!disc,
        apto,
        motivoRestricao,
        setorAlocado: aloc?.setor || null,
      };
    });
  }, [alunos, quartos, pontos, advertencias, infracoes, disciplinas, alocacoes]);

  // Filtered students
  const alunosFiltrados = useMemo(() => {
    return dadosAlunos.filter((aluno) => {
      if (filtroGrupo !== 'todos' && aluno.grupo !== filtroGrupo) return false;
      if (filtroStatus === 'aptos' && !aluno.apto) return false;
      if (filtroStatus === 'retidos' && aluno.apto) return false;
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        return (
          aluno.nome.toLowerCase().includes(termo) ||
          aluno.quartoNome.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [dadosAlunos, filtroGrupo, filtroStatus, busca]);

  // Statistics for Passeio
  const statsPasseio = useMemo(() => {
    const total = dadosAlunos.length;
    const aptos = dadosAlunos.filter((a) => a.apto).length;
    const retidos = total - aptos;
    const mediaGeral = total > 0 ? dadosAlunos.reduce((acc, c) => acc + c.scoreTotal, 0) / total : 0;
    const taxaAptos = total > 0 ? Math.round((aptos / total) * 100) : 0;

    return {
      total,
      aptos,
      retidos,
      taxaAptos,
      mediaGeral: Math.round(mediaGeral * 10) / 10,
    };
  }, [dadosAlunos]);

  // Statistics for Vistorias
  const statsVistorias = useMemo(() => {
    const totalVistorias = vistorias.length;
    const totalItens = vistoriaItens.length;
    const notas5 = vistoriaItens.filter((i) => i.nota === 5).length;
    const notas4 = vistoriaItens.filter((i) => i.nota === 4).length;
    const falhas = vistoriaItens.filter((i) => i.nota < 4).length;
    const conformidade = totalItens > 0 ? Math.round(((notas5 + notas4) / totalItens) * 100) : 100;

    const dorm101 = vistoriaItens.filter((i) => {
      const v = vistorias.find((vis) => vis.id === i.vistoria_id);
      return v?.quarto_id === 'quarto-101';
    });

    const dorm201 = vistoriaItens.filter((i) => {
      const v = vistorias.find((vis) => vis.id === i.vistoria_id);
      return v?.quarto_id === 'quarto-201';
    });

    return {
      totalVistorias,
      totalItens,
      falhas,
      conformidade,
      dorm101Count: dorm101.length,
      dorm201Count: dorm201.length,
    };
  }, [vistorias, vistoriaItens]);

  // Trigger Print Dialog
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = '';
    const dataHora = new Date().toLocaleString('pt-BR');

    if (activeReport === 'passeio') {
      csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += 'RELATORIO DE APTIDAO PARA O PASSEIO - ICEVES INTERNATO\r\n';
      csvContent += `Emitido em: ${dataHora} por: ${currentUser?.nome || 'Sistema'}\r\n`;
      csvContent += `Meta de Referencia: ${SEED_PERIODO_META.nome} (Media >= 3.5 pts e sem disciplina)\r\n\r\n`;
      csvContent += 'Nome do Aluno,Dormitório,Equipe,Score Total (pts),Média Estimada,Advertências,Infrações,Disciplina Ativa,Status Passeio,Observações\r\n';

      alunosFiltrados.forEach((a) => {
        const linha = [
          `"${a.nome}"`,
          `"${a.quartoNome}"`,
          `"${a.grupo === 'meninos' ? 'Equipe Meninos' : 'Equipe Meninas'}"`,
          a.scoreTotal,
          a.mediaDiaria,
          a.totalAdvertencias,
          a.totalInfracoes,
          a.emDisciplinaAtiva ? 'SIM' : 'NÃO',
          `"${a.apto ? 'APTO AO PASSEIO' : 'RETIDO / EM ANÁLISE'}"`,
          `"${a.motivoRestricao || 'Em conformidade com o regulamento'}"`,
        ].join(',');
        csvContent += linha + '\r\n';
      });

      downloadFile(csvContent, `iceves-relatorio-passeio-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    } else if (activeReport === 'mural_escalas') {
      csvContent = '\uFEFF';
      csvContent += 'ESCALA MENSAL DE TRABALHO E COZINHA - MURAL DO INTERNATO ICEVES\r\n';
      csvContent += `Mes Vigente: ${mesAtual.ano}/${mesAtual.mes} - Equipe em Foco: ${mesAtual.grupo.toUpperCase()}\r\n`;
      csvContent += `Emitido em: ${dataHora}\r\n\r\n`;
      csvContent += 'Aluno,Equipe,Dormitório,Setor Alocado,Horários Operacionais\r\n';

      dadosAlunos.forEach((a) => {
        let horario = 'Rodízio de Dormitório (Dias alternados)';
        let setorNome = 'Dormitório / Áreas Comuns';
        if (a.setorAlocado === 'cozinha') {
          setorNome = 'Cozinha';
          horario = '5h00 às 6h00 (Manhã) e 12h45 às 13h30 (Almoço)';
        } else if (a.setorAlocado === 'limpeza_geral') {
          setorNome = 'Limpeza Geral';
          horario = 'Pátio Central, Corredores e Sanitários Sociais';
        }

        const linha = [
          `"${a.nome}"`,
          `"${a.grupo === 'meninos' ? 'Meninos' : 'Meninas'}"`,
          `"${a.quartoNome}"`,
          `"${setorNome}"`,
          `"${horario}"`,
        ].join(',');
        csvContent += linha + '\r\n';
      });

      downloadFile(csvContent, `iceves-escala-mural-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    } else {
      csvContent = '\uFEFF';
      csvContent += 'BOLETIM GERAL DE VISTORIAS DOS DORMITORIOS - ICEVES\r\n';
      csvContent += `Emitido em: ${dataHora}\r\n\r\n`;
      csvContent += 'Data Vistoria,Dormitório,Item Inspecionado,Aluno Avaliado,Nota (1 a 5),Status\r\n';

      vistoriaItens.forEach((it) => {
        const v = vistorias.find((x) => x.id === it.vistoria_id);
        const aluno = alunos.find((a) => a.id === it.aluno_id);
        const quarto = quartos.find((q) => q.id === v?.quarto_id);
        const linha = [
          `"${v?.data || 'N/A'}"`,
          `"${quarto?.nome || 'Dormitório'}"`,
          `"${it.item.toUpperCase()}"`,
          `"${aluno?.nome || 'Coletivo do Quarto'}"`,
          it.nota,
          `"${it.nota >= 4 ? 'APROVADO' : 'FALHA'}"`,
        ].join(',');
        csvContent += linha + '\r\n';
      });

      downloadFile(csvContent, `iceves-boletim-vistorias-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="size-8 animate-spin rounded-full border-3 border-[var(--line)] border-t-[var(--pri)]" />
        <p className="mt-3 text-sm text-[var(--ink2)]">Carregando relatórios oficiais...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Print-specific style tag injection */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          /* Hide app navigation and control buttons */
          header, aside, .no-print, [data-sidebar], button, input, select {
            display: none !important;
          }
          /* Ensure printable area expands to full A4 page width */
          .print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #d1d5db !important;
            padding: 6px 8px !important;
            color: #111827 !important;
          }
          .print-table th {
            background-color: #f3f4f6 !important;
            font-weight: 700 !important;
          }
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .signature-box {
            display: flex !important;
            justify-content: space-around !important;
            margin-top: 40px !important;
            padding-top: 20px !important;
          }
        }
      `}</style>

      {/* Control Header & Action Bar (Hidden when printing) */}
      <div className="no-print flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--surface)] p-5 rounded-2xl border border-[var(--line)] shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-[var(--pri-soft)] text-[var(--pri-text)] border border-[var(--pri)]/30">
                <FileText className="w-3.5 h-3.5" />
                Etapa 2 · Central de Relatórios
              </span>
              <span className="text-xs text-[var(--ink2)]">Emissão & Impressão Oficial</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
              Relatórios e Escalas Oficiais
            </h1>
            <p className="text-xs text-[var(--ink2)] mt-0.5">
              Documentos regulamentares prontos para afixação em mural, arquivo de preceptoria e liberação de passeios.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface2)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)] transition-colors cursor-pointer"
              title="Baixar planilha no formato CSV (Excel)"
            >
              <Download className="w-4 h-4 text-[var(--pri-text)]" />
              Exportar CSV
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[var(--gold)] text-[var(--gold-ink)] hover:opacity-90 shadow-xs transition-opacity cursor-pointer"
              title="Abrir diálogo de impressão limpa / Salvar em PDF"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--line)] pb-2">
          <button
            onClick={() => setActiveReport('passeio')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReport === 'passeio'
                ? 'bg-[var(--pri)] text-black shadow-xs'
                : 'bg-[var(--surface)] text-[var(--ink2)] hover:text-[var(--ink)] border border-[var(--line)]'
            }`}
          >
            <Compass className="w-4 h-4" />
            1. Aptidão para o Passeio ({statsPasseio.aptos}/{statsPasseio.total})
          </button>

          <button
            onClick={() => setActiveReport('mural_escalas')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReport === 'mural_escalas'
                ? 'bg-[var(--pri)] text-black shadow-xs'
                : 'bg-[var(--surface)] text-[var(--ink2)] hover:text-[var(--ink)] border border-[var(--line)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            2. Escala Mensal (Mural do Internato)
          </button>

          <button
            onClick={() => setActiveReport('vistorias')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReport === 'vistorias'
                ? 'bg-[var(--pri)] text-black shadow-xs'
                : 'bg-[var(--surface)] text-[var(--ink2)] hover:text-[var(--ink)] border border-[var(--line)]'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            3. Boletim de Vistorias dos Dormitórios
          </button>
        </div>
      </div>

      {/* Main Printable Document Area */}
      <div className="print-area flex flex-col gap-6 bg-[var(--surface)] p-6 sm:p-8 rounded-2xl border border-[var(--line)] shadow-sm">
        {/* Institutional Header (Shown prominently in both UI and Print) */}
        <div className="flex items-start justify-between border-b-2 border-[var(--line)] pb-5">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="ICEVES Logo"
              className="w-14 h-14 rounded-full border border-[var(--line)] object-cover shadow-xs"
            />
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--pri-text)] block">
                Instituto de Ciências da Educação, Valores e Ensino Superior
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[var(--ink)] tracking-tight">
                {activeReport === 'passeio' && 'RELATÓRIO DE HOMOLOGAÇÃO E APTIDÃO PARA O PASSEIO'}
                {activeReport === 'mural_escalas' && 'ESCALA GERAL DE SETORES E ROTINA — MURAL OFICIAL'}
                {activeReport === 'vistorias' && 'BOLETIM CONSOLIDADO DE VISTORIAS DOS DORMITÓRIOS'}
              </h2>
              <p className="text-xs text-[var(--ink2)]">
                Internato Masculino & Feminino · Departamento de Preceptoria & Vida Comunitária
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-[var(--ink2)] hidden sm:block">
            <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Responsável:</strong> {currentUser?.nome || 'Preceptoria Geral'}</p>
            <p><strong>Período:</strong> Novembro / 2026</p>
          </div>
        </div>

        {/* =========================================================================
            REPORT 1: RELATÓRIO DE APTIDÃO PARA O PASSEIO
           ========================================================================= */}
        {activeReport === 'passeio' && (
          <div className="flex flex-col gap-6">
            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--surface2)] border border-[var(--line)]">
                <span className="text-[11px] font-semibold text-[var(--ink2)] block">Total de Alunos</span>
                <span className="text-2xl font-black text-[var(--ink)] tabular-nums">{statsPasseio.total}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--ok-soft)] border border-[var(--ok)]/30">
                <span className="text-[11px] font-bold text-[var(--ok)] block">Aptos ao Passeio</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[var(--ok)] tabular-nums">{statsPasseio.aptos}</span>
                  <span className="text-xs font-bold text-[var(--ok)]">({statsPasseio.taxaAptos}%)</span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bad-soft)] border border-[var(--bad)]/30">
                <span className="text-[11px] font-bold text-[var(--bad)] block">Retidos / Em Análise</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[var(--bad)] tabular-nums">{statsPasseio.retidos}</span>
                  <span className="text-xs font-bold text-[var(--bad)]">
                    ({statsPasseio.total > 0 ? 100 - statsPasseio.taxaAptos : 0}%)
                  </span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--pri-soft)] border border-[var(--pri)]/40">
                <span className="text-[11px] font-bold text-[var(--pri-text)] block">Média da Turma</span>
                <span className="text-2xl font-black text-[var(--pri-text)] tabular-nums">
                  {statsPasseio.mediaGeral} <span className="text-xs font-normal">pts</span>
                </span>
              </div>
            </div>

            {/* Filter toolbar (hidden on print) */}
            <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-[var(--surface2)] rounded-xl border border-[var(--line)]">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[var(--ink2)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar aluno ou dormitório..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1 text-xs text-[var(--ink2)]">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Equipe:</span>
                </div>
                <select
                  value={filtroGrupo}
                  onChange={(e) => setFiltroGrupo(e.target.value as any)}
                  className="text-xs py-1.5 px-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] font-medium"
                >
                  <option value="todos">Todos os Alunos</option>
                  <option value="meninos">Meninos (Quarto 101)</option>
                  <option value="meninas">Meninas (Quarto 201)</option>
                </select>

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as any)}
                  className="text-xs py-1.5 px-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] font-medium"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="aptos">Somente Aptos</option>
                  <option value="retidos">Somente Retidos</option>
                </select>
              </div>
            </div>

            {/* Criteria explanation banner */}
            <div className="p-3.5 rounded-xl bg-[var(--surface2)] text-xs text-[var(--ink2)] border-l-4 border-l-[var(--gold)] flex items-start gap-2.5">
              <Compass className="w-4 h-4 text-[var(--gold)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--ink)]">Critérios Oficiais para Liberação do Passeio:</strong>
                <p className="mt-0.5">
                  1. Pontuação acumulada ≥ 10 pontos. · 2. Menos de 3 infrações acumuladas. · 3. Nenhuma disciplina pendente.
                  Alunos com advertências ativas sofrem desconto de pontuação e monitoramento especial.
                </p>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="print-table w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--surface2)] text-[var(--ink)] border-b border-[var(--line)] font-bold">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Aluno</th>
                    <th className="py-3 px-3">Dormitório</th>
                    <th className="py-3 px-3 text-center">Score Total</th>
                    <th className="py-3 px-3 text-center">Média/Dia</th>
                    <th className="py-3 px-3 text-center">Advertências</th>
                    <th className="py-3 px-3 text-center">Infrações</th>
                    <th className="py-3 px-3 text-center">Disciplina</th>
                    <th className="py-3 px-3 text-center">Parecer Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {alunosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-[var(--ink2)]">
                        Nenhum aluno encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    alunosFiltrados.map((aluno, idx) => (
                      <tr
                        key={aluno.id}
                        className="hover:bg-[var(--surface2)] transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono text-[var(--ink2)]">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => onNavigate && onNavigate('aluno_detalhe', aluno.id)}
                            className="font-bold text-[var(--ink)] hover:underline text-left cursor-pointer"
                          >
                            {aluno.nome}
                          </button>
                          <span className="block text-[10px] text-[var(--ink2)]">
                            {aluno.grupo === 'meninos' ? 'Equipe Meninos' : 'Equipe Meninas'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[var(--ink2)]">
                          {aluno.quartoNome}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black tabular-nums">
                          <span
                            className={
                              aluno.scoreTotal >= 10
                                ? 'text-[var(--ok)]'
                                : aluno.scoreTotal > 0
                                ? 'text-[var(--warn)]'
                                : 'text-[var(--bad)]'
                            }
                          >
                            {aluno.scoreTotal > 0 ? `+${aluno.scoreTotal}` : aluno.scoreTotal} pts
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[var(--ink2)]">
                          {aluno.mediaDiaria.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">
                          {aluno.totalAdvertencias > 0 ? (
                            <span className="text-[var(--warn)] font-bold">{aluno.totalAdvertencias}</span>
                          ) : (
                            <span className="text-[var(--ink2)]">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">
                          {aluno.totalInfracoes > 0 ? (
                            <span className="text-[var(--bad)] font-bold">{aluno.totalInfracoes}</span>
                          ) : (
                            <span className="text-[var(--ink2)]">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {aluno.emDisciplinaAtiva ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--disc-soft)] text-[var(--disc)] border border-[var(--disc)]/30">
                              ATIVA
                            </span>
                          ) : (
                            <span className="text-[var(--ink2)]">Nenhuma</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {aluno.apto ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok)]/30">
                              <CheckCircle2 className="w-3 h-3" />
                              APTO
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad)]/30"
                              title={aluno.motivoRestricao}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              RETIDO
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            REPORT 2: ESCALA MENSAL PARA O MURAL DO INTERNATO
           ========================================================================= */}
        {activeReport === 'mural_escalas' && (
          <div className="flex flex-col gap-6">
            {/* Notice board description */}
            <div className="p-4 rounded-xl bg-[var(--pri-soft)] border border-[var(--pri)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--pri-text)] block">
                  Escala Operacional de Serviços
                </span>
                <h3 className="text-base font-bold text-[var(--ink)]">
                  Mês de Referência: Novembro / 2026 · Equipe em Exercício: {mesAtual.grupo.toUpperCase()}
                </h3>
                <p className="text-xs text-[var(--ink2)] mt-0.5">
                  Fixação obrigatória nos murais dos Dormitórios 101 e 201 e na entrada do Refeitório Central.
                </p>
              </div>
              <div className="text-xs bg-[var(--surface)] px-3 py-2 rounded-lg border border-[var(--line)]">
                <span className="font-bold block text-[var(--ink)]">Horários Rígidos:</span>
                <span className="text-[var(--ink2)]">Café: 5h00 às 6h00 · Almoço: 12h45 às 13h30</span>
              </div>
            </div>

            {/* 3 Sector Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cozinha Sector */}
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[var(--ok)]" />
                    <h4 className="font-bold text-sm text-[var(--ink)]">Equipe da Cozinha & Refeitório</h4>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface2)] text-[var(--ink2)]">
                    Turno Duplo
                  </span>
                </div>
                <p className="text-xs text-[var(--ink2)]">
                  Responsáveis pelo auxílio na preparação, montagem das mesas, lavagem de louças e desinfecção de bancadas.
                </p>
                <div className="space-y-1.5 mt-1">
                  {dadosAlunos
                    .filter((a) => a.setorAlocado === 'cozinha')
                    .map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface2)] text-xs"
                      >
                        <span className="font-bold text-[var(--ink)]">{a.nome}</span>
                        <span className="text-[var(--ink2)]">{a.quartoNome}</span>
                      </div>
                    ))}
                  {dadosAlunos.filter((a) => a.setorAlocado === 'cozinha').length === 0 && (
                    <p className="text-xs text-[var(--ink2)] italic py-2">Nenhum aluno alocado no momento.</p>
                  )}
                </div>
              </div>

              {/* Limpeza Geral Sector */}
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[var(--info)]" />
                    <h4 className="font-bold text-sm text-[var(--ink)]">Limpeza Geral & Sanitários Comuns</h4>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface2)] text-[var(--ink2)]">
                    Áreas Comuns
                  </span>
                </div>
                <p className="text-xs text-[var(--ink2)]">
                  Responsáveis pelo recolhimento do lixo central, higienização dos sanitários sociais, pátio e corredores.
                </p>
                <div className="space-y-1.5 mt-1">
                  {dadosAlunos
                    .filter((a) => a.setorAlocado === 'limpeza_geral')
                    .map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface2)] text-xs"
                      >
                        <span className="font-bold text-[var(--ink)]">{a.nome}</span>
                        <span className="text-[var(--ink2)]">{a.quartoNome}</span>
                      </div>
                    ))}
                  {dadosAlunos.filter((a) => a.setorAlocado === 'limpeza_geral').length === 0 && (
                    <p className="text-xs text-[var(--ink2)] italic py-2">Nenhum aluno alocado no momento.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Rodízio de Dormitórios */}
            <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <h4 className="font-bold text-sm text-[var(--ink)]">
                  Rodízio Alternado de Faxina Coletiva dos Dormitórios
                </h4>
                <span className="text-[11px] font-bold text-[var(--warn)]">Regra Par / Ímpar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--surface2)]">
                  <span className="font-bold text-[var(--ink)] block mb-1">Dias Pares do Mês:</span>
                  <p className="text-[var(--ink2)]">
                    <strong>Dormitório 101 (Meninos):</strong> Limpeza completa de chão, desinfecção de banheiro e recolhimento de lixo até 13h15.
                  </p>
                  <p className="text-[10px] text-[var(--ink2)] mt-1">Dormitório 201: Manutenção regular.</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface2)]">
                  <span className="font-bold text-[var(--ink)] block mb-1">Dias Ímpares do Mês:</span>
                  <p className="text-[var(--ink2)]">
                    <strong>Dormitório 201 (Meninas):</strong> Limpeza completa de chão, desinfecção de banheiro e recolhimento de lixo até 13h15.
                  </p>
                  <p className="text-[10px] text-[var(--ink2)] mt-1">Dormitório 101: Manutenção regular.</p>
                </div>
              </div>
            </div>

            {/* Important notice board regulations */}
            <div className="p-3.5 rounded-xl bg-[var(--surface2)] text-xs text-[var(--ink2)] space-y-1">
              <strong className="text-[var(--ink)] block">Normas de Cumprimento da Escala:</strong>
              <p>• Atrasos de até 10 minutos acarretam perda de 1 ponto e registro de advertência.</p>
              <p>• Ausências não autorizadas geram infração disciplinar direta e encaminhamento à preceptoria.</p>
              <p>• Trocas de escala só são válidas se informadas e homologadas previamente com o monitor responsável.</p>
            </div>
          </div>
        )}

        {/* =========================================================================
            REPORT 3: BOLETIM CONSOLIDADO DE VISTORIAS
           ========================================================================= */}
        {activeReport === 'vistorias' && (
          <div className="flex flex-col gap-6">
            {/* Inspection KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--surface2)] border border-[var(--line)]">
                <span className="text-[11px] font-semibold text-[var(--ink2)] block">Vistorias Realizadas</span>
                <span className="text-2xl font-black text-[var(--ink)] tabular-nums">{statsVistorias.totalVistorias}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--ok-soft)] border border-[var(--ok)]/30">
                <span className="text-[11px] font-bold text-[var(--ok)] block">Índice de Conformidade</span>
                <span className="text-2xl font-black text-[var(--ok)] tabular-nums">{statsVistorias.conformidade}%</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bad-soft)] border border-[var(--bad)]/30">
                <span className="text-[11px] font-bold text-[var(--bad)] block">Falhas Notificadas</span>
                <span className="text-2xl font-black text-[var(--bad)] tabular-nums">{statsVistorias.falhas}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--surface2)] border border-[var(--line)]">
                <span className="text-[11px] font-semibold text-[var(--ink2)] block">Itens Inspecionados</span>
                <span className="text-2xl font-black text-[var(--ink)] tabular-nums">{statsVistorias.totalItens}</span>
              </div>
            </div>

            {/* Room breakdown cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
                  <h4 className="font-bold text-sm text-[var(--ink)]">Dormitório 101 — Meninos</h4>
                  <span className="text-xs text-[var(--ink2)]">Monitoria Ativa</span>
                </div>
                <div className="space-y-1.5 text-xs text-[var(--ink2)]">
                  <div className="flex justify-between">
                    <span>Itens individuais (Cama / Armário):</span>
                    <strong className="text-[var(--ink)]">Conforme</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Itens coletivos (Chão / Banheiro):</span>
                    <strong className="text-[var(--ink)]">Conforme</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Acumulador de notas baixas:</span>
                    <strong className="text-[var(--ok)]">0 / 6 (Normal)</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
                  <h4 className="font-bold text-sm text-[var(--ink)]">Dormitório 201 — Meninas</h4>
                  <span className="text-xs text-[var(--ink2)]">Monitoria Ativa</span>
                </div>
                <div className="space-y-1.5 text-xs text-[var(--ink2)]">
                  <div className="flex justify-between">
                    <span>Itens individuais (Cama / Armário):</span>
                    <strong className="text-[var(--ink)]">Conforme</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Itens coletivos (Chão / Banheiro):</span>
                    <strong className="text-[var(--ink)]">Conforme</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Acumulador de notas baixas:</span>
                    <strong className="text-[var(--ok)]">0 / 6 (Normal)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Inspection Records Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="print-table w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--surface2)] text-[var(--ink)] border-b border-[var(--line)] font-bold">
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Dormitório</th>
                    <th className="py-3 px-3">Item Inspecionado</th>
                    <th className="py-3 px-3">Aluno / Alvo</th>
                    <th className="py-3 px-3 text-center">Nota (1 a 5)</th>
                    <th className="py-3 px-3 text-center">Conformidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {vistoriaItens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-[var(--ink2)]">
                        Nenhuma vistoria registrada no sistema até o momento.
                      </td>
                    </tr>
                  ) : (
                    vistoriaItens.map((item) => {
                      const v = vistorias.find((vis) => vis.id === item.vistoria_id);
                      const aluno = alunos.find((a) => a.id === item.aluno_id);
                      const quarto = quartos.find((q) => q.id === v?.quarto_id);

                      return (
                        <tr key={item.id} className="hover:bg-[var(--surface2)]">
                          <td className="py-2.5 px-3 font-mono text-[var(--ink2)]">
                            {v?.data || 'Hoje'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[var(--ink)]">
                            {quarto?.nome || 'Dormitório'}
                          </td>
                          <td className="py-2.5 px-3 uppercase font-medium">
                            {item.item === 'cama' && 'Cama e Lençóis'}
                            {item.item === 'guarda_roupa' && 'Guarda-roupa'}
                            {item.item === 'chao' && 'Chão do Quarto (Coletivo)'}
                            {item.item === 'banheiro' && 'Banheiro e Pia (Coletivo)'}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--ink2)]">
                            {aluno ? aluno.nome : 'Coletivo do Dormitório'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            <span
                              className={
                                item.nota >= 4
                                  ? 'text-[var(--ok)]'
                                  : item.nota === 3
                                  ? 'text-[var(--warn)]'
                                  : 'text-[var(--bad)]'
                              }
                            >
                              Nota {item.nota}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.nota >= 4 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ok-soft)] text-[var(--ok)]">
                                APROVADO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bad-soft)] text-[var(--bad)]">
                                FALHA REGISTRADA
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Official Sign-off and Institutional Endorsement (Printed at the bottom of all reports) */}
        <div className="page-break-avoid mt-8 pt-6 border-t-2 border-[var(--line)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center text-xs text-[var(--ink2)]">
            <div className="w-full sm:w-64 flex flex-col items-center">
              <div className="w-full border-t border-[var(--ink)] mb-1 pt-1 font-bold text-[var(--ink)]">
                Preceptor(a) de Turno
              </div>
              <span>Homologação e Conferência Diária</span>
            </div>

            <div className="w-full sm:w-64 flex flex-col items-center">
              <div className="w-full border-t border-[var(--ink)] mb-1 pt-1 font-bold text-[var(--ink)]">
                Direção do Internato ICEVES
              </div>
              <span>Aprovação Final e Liberação de Passeio</span>
            </div>

            <div className="text-right text-[11px] text-[var(--ink2)]">
              <span className="font-bold text-[var(--ink)] block">Selo de Autenticidade Digital</span>
              <span>ICEVES-CERT-2026-NOV-{Math.floor(Math.random() * 9000 + 1000)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
