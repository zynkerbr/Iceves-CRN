import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { Quarto, Aluno, Mes, AlocacaoSetor, SetorEquipe } from '../../types';
import { Badge } from '../../components/ui/Badge';
import {
  Calendar,
  Clock,
  Utensils,
  Sparkles,
  Home,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
  Printer
} from 'lucide-react';
import { SEED_MES } from '../../data/seed';

export function EscalasView() {
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [mesAtual, setMesAtual] = useState<Mes>(SEED_MES);
  const [alocacoes, setAlocacoes] = useState<AlocacaoSetor[]>([]);

  useEffect(() => {
    const carregar = async () => {
      const q = await db.quartos.toArray();
      const a = await db.alunos.toArray();
      const m = (await db.meses.toCollection().first()) || SEED_MES;
      const aloc = await db.alocacoes.toArray();

      setQuartos(q);
      setAlunos(a);
      setMesAtual(m);
      setAlocacoes(aloc);
    };
    carregar();
  }, []);

  const handleMudarDia = (dias: number) => {
    const nova = new Date(dataSelecionada);
    nova.setDate(nova.getDate() + dias);
    setDataSelecionada(nova);
  };

  // Cálculo do Rodízio Automático de Dormitórios
  // Regra: dia par limpa Quarto 101, dia ímpar limpa Quarto 201
  const diaDoMes = dataSelecionada.getDate();
  const quartoLimpezaId = diaDoMes % 2 === 0 ? 'quarto-101' : 'quarto-201';
  const quartoFolgaId = diaDoMes % 2 === 0 ? 'quarto-201' : 'quarto-101';

  const quartoLimpeza = quartos.find((q) => q.id === quartoLimpezaId);
  const quartoFolga = quartos.find((q) => q.id === quartoFolgaId);

  // Alunos alocados na equipe do mês (cozinha / limpeza geral)
  const alunosEquipeDoMes = alunos.filter((a) => a.grupo === mesAtual.grupo);
  const alunosDormitorio = alunos.filter((a) => a.grupo !== mesAtual.grupo);

  const getSetorAluno = (alunoId: string): SetorEquipe | null => {
    const al = alocacoes.find((x) => x.aluno_id === alunoId);
    return al ? al.setor : null;
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
      {/* Cabeçalho da Escala */}
      <div className="card p-5 bg-[var(--surface)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-[var(--pri-text)] flex items-center gap-1.5 mb-1">
            <Calendar className="w-4 h-4 text-[var(--ok)]" />
            Rotina e Escalas do Internato
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            Escalas Diárias de Trabalho
          </h2>
          <p className="text-xs text-[var(--ink2)] mt-0.5">
            Equipe do mês ({mesAtual.grupo}) na Cozinha/Limpeza Geral · Demais alunos em rodízio de dormitório.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[var(--surface2)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)] transition-colors cursor-pointer"
            title="Imprimir visualização atual para mural"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--pri-text)]" />
            Imprimir
          </button>

          {/* Navegador de Datas para testar o rodízio */}
          <div className="flex items-center gap-2 bg-[var(--surface2)] p-1.5 rounded-xl border border-[var(--line)]">
            <button
              onClick={() => handleMudarDia(-1)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--ink)] cursor-pointer"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2 text-center">
              <span className="block text-xs font-bold text-[var(--ink)]">
                {dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
              <span className="text-[10px] text-[var(--ink2)]">
                Dia {diaDoMes} ({diaDoMes % 2 === 0 ? 'Par' : 'Ímpar'})
              </span>
            </div>
            <button
              onClick={() => handleMudarDia(1)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--ink)] cursor-pointer"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. Rodízio de Dormitórios (Demais Alunos) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
            <Home className="w-4 h-4 text-[var(--pri-text)]" />
            Rodízio de Dormitório (12:45 às 13:30)
          </h3>
          <span className="text-xs text-[var(--ink2)]">Alternância diária automática</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quarto de Hoje */}
          <div className="card p-5 bg-[var(--surface)] border-2 border-[var(--pri)] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--pri-text)]">
                  Quarto Escalado Hoje
                </span>
                <Badge variant="ok">Limpeza Ativa</Badge>
              </div>
              <h4 className="text-xl font-extrabold text-[var(--ink)] mb-1">
                {quartoLimpeza?.nome || 'Dormitório 101'}
              </h4>
              <p className="text-xs text-[var(--ink2)] mb-3">
                Horário obrigatório: 12:45 às 13:30 (varrer, passar pano, recolher lixo e higienizar banheiro).
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--line)]">
              <span className="text-xs font-bold text-[var(--ink)] block mb-1">Alunos escalados:</span>
              <div className="flex flex-wrap gap-1.5">
                {alunos
                  .filter((a) => a.quarto_id === quartoLimpeza?.id)
                  .map((a) => (
                    <span
                      key={a.id}
                      className="text-xs px-2.5 py-1 rounded-md bg-[var(--surface2)] text-[var(--ink)] font-medium"
                    >
                      {a.nome}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Quarto de Folga */}
          <div className="card p-5 bg-[var(--surface)] border border-[var(--line)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink2)]">
                  Quarto de Folga
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface2)] text-[var(--ink2)] font-semibold">
                  Descanso / Livre
                </span>
              </div>
              <h4 className="text-xl font-extrabold text-[var(--ink)] mb-1">
                {quartoFolga?.nome || 'Dormitório 201'}
              </h4>
              <p className="text-xs text-[var(--ink2)] mb-3">
                Livre da limpeza geral de dormitório hoje pelo rodízio alternado (um dia limpa, no outro fica livre).
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--line)]">
              <span className="text-xs font-bold text-[var(--ink2)] block mb-1">Alunos em folga do quarto:</span>
              <div className="flex flex-wrap gap-1.5">
                {alunos
                  .filter((a) => a.quarto_id === quartoFolga?.id)
                  .map((a) => (
                    <span
                      key={a.id}
                      className="text-xs px-2.5 py-1 rounded-md bg-[var(--surface2)] text-[var(--ink2)]"
                    >
                      {a.nome}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Equipe do Mês (Sem Folga: Cozinha e Limpeza Geral) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--gold)]" />
              Equipe do Mês: {mesAtual.grupo.toUpperCase()} (Sem Folga)
            </h3>
            <span className="text-xs text-[var(--ink2)]">
              Horários diários: <strong>5h às 6h</strong> e <strong>12:45 às 13:30</strong>
            </span>
          </div>
          <Badge variant="pri">Mês de Novembro</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Setor Cozinha */}
          <div className="card p-4 sm:p-5 bg-[var(--surface)] border border-[var(--line)] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--warn-soft)] flex items-center justify-center text-[var(--warn)]">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--ink)]">Setor Cozinha e Refeitório</h4>
                <span className="text-xs text-[var(--ink2)]">Preparo, reposição e lavagem</span>
              </div>
            </div>

            <div className="divide-y divide-[var(--line)] text-xs">
              {alunosEquipeDoMes
                .filter((a) => getSetorAluno(a.id) === 'cozinha')
                .map((a) => (
                  <div key={a.id} className="py-2 flex items-center justify-between">
                    <span className="font-semibold text-[var(--ink)]">{a.nome}</span>
                    <Badge variant="ok">Cozinha</Badge>
                  </div>
                ))}
              {alunosEquipeDoMes.filter((a) => getSetorAluno(a.id) === 'cozinha').length === 0 && (
                <p className="text-[var(--ink2)] py-2">Nenhum aluno alocado para a cozinha.</p>
              )}
            </div>
          </div>

          {/* Setor Limpeza Geral */}
          <div className="card p-4 sm:p-5 bg-[var(--surface)] border border-[var(--line)] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--pri-soft)] flex items-center justify-center text-[var(--pri-text)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--ink)]">Setor Limpeza Geral</h4>
                <span className="text-xs text-[var(--ink2)]">Refeitório comum e auditório</span>
              </div>
            </div>

            <div className="divide-y divide-[var(--line)] text-xs">
              {alunosEquipeDoMes
                .filter((a) => getSetorAluno(a.id) === 'limpeza_geral')
                .map((a) => (
                  <div key={a.id} className="py-2 flex items-center justify-between">
                    <span className="font-semibold text-[var(--ink)]">{a.nome}</span>
                    <Badge variant="pri">Limpeza Geral</Badge>
                  </div>
                ))}
              {alunosEquipeDoMes.filter((a) => getSetorAluno(a.id) === 'limpeza_geral').length === 0 && (
                <p className="text-[var(--ink2)] py-2">Nenhum aluno alocado para limpeza geral.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--surface2)] text-xs text-[var(--ink2)] flex items-start gap-2">
          <Info className="w-4 h-4 text-[var(--info)] shrink-0 mt-0.5" />
          <span>
            <strong>Regra da Equipe do Mês:</strong> Os alunos da equipe do mês não participam da limpeza dos dormitórios (fora do rodízio, conforme parâmetro <code>equipe_do_mes_no_rodizio=false</code>). Quem higieniza o quarto deles é designado pelo monitor.
          </span>
        </div>
      </div>
    </div>
  );
}
