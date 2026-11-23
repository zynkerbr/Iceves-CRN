import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { Aluno, Quarto } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { ScoreCount } from '../../components/ui/ScoreCount';
import { getScoreAluno } from '../../lib/regras';
import {
  Users,
  Search,
  Plus,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle,
  Home
} from 'lucide-react';

export function ListaAlunosView({
  onSelectAluno,
  onOpenAdvertencia,
}: {
  onSelectAluno: (alunoId: string) => void;
  onOpenAdvertencia: (alunoId: string) => void;
}) {
  const { currentUser, canAccessStudent } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState<string>('');
  const [filtroGrupo, setFiltroGrupo] = useState<'todos' | 'meninos' | 'meninas'>('todos');

  useEffect(() => {
    const carregar = async () => {
      const todosAlunos = await db.alunos.toArray();
      const todosQuartos = await db.quartos.toArray();

      // Aplicar regras de RLS
      const permitidos = todosAlunos.filter((a) => canAccessStudent(a.id, a.quarto_id));
      setAlunos(permitidos);
      setQuartos(todosQuartos);

      const scMap: Record<string, number> = {};
      for (const a of permitidos) {
        scMap[a.id] = await getScoreAluno(a.id);
      }
      setScores(scMap);
    };
    carregar();
  }, [currentUser]);

  const quartosMap = new Map(quartos.map((q) => [q.id, q.nome]));

  const filtrados = alunos.filter((alu) => {
    const matchNome = alu.nome.toLowerCase().includes(busca.toLowerCase());
    const matchGrupo = filtroGrupo === 'todos' || alu.grupo === filtroGrupo;
    return matchNome && matchGrupo;
  });

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto pb-20">
      {/* Cabeçalho */}
      <div className="card p-5 bg-[var(--surface)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-[var(--pri-text)] flex items-center gap-1.5 mb-1">
            <Users className="w-4 h-4 text-[var(--ok)]" />
            Alunos do Internato
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            Quadro de Alunos e Scores
          </h2>
          <p className="text-xs text-[var(--ink2)] mt-0.5">
            Acompanhe a pontuação, conduta e situação disciplinar individual.
          </p>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno..."
              className="f text-xs sm:w-48 pl-8"
            />
            <Search className="w-3.5 h-3.5 text-[var(--ink2)] absolute left-2.5 top-3.5 pointer-events-none" />
          </div>

          <div className="seg">
            <button
              onClick={() => setFiltroGrupo('todos')}
              className={filtroGrupo === 'todos' ? 'on' : ''}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroGrupo('meninos')}
              className={filtroGrupo === 'meninos' ? 'on' : ''}
            >
              Meninos
            </button>
            <button
              onClick={() => setFiltroGrupo('meninas')}
              className={filtroGrupo === 'meninas' ? 'on' : ''}
            >
              Meninas
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Alunos em Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filtrados.length === 0 ? (
          <div className="card col-span-full py-12 text-center text-xs text-[var(--ink2)]">
            Nenhum aluno localizado com os filtros atuais.
          </div>
        ) : (
          filtrados.map((alu) => {
            const sc = scores[alu.id] ?? 0;
            const quartoNome = alu.quarto_id ? quartosMap.get(alu.quarto_id) : 'Sem quarto';

            return (
              <div
                key={alu.id}
                className="card p-4 bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--pri)] hover:shadow-sm transition-all flex flex-col justify-between gap-3 group"
              >
                <div
                  onClick={() => onSelectAluno(alu.id)}
                  className="cursor-pointer flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-extrabold text-base text-[var(--ink)] group-hover:text-[var(--pri-text)] transition-colors">
                        {alu.nome}
                      </h4>
                      {alu.em_disciplina && (
                        <Badge variant="disc" className="text-[10px] py-0 px-1.5">
                          Disciplina
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--ink2)] font-medium">
                      <span className="flex items-center gap-1">
                        <Home className="w-3 h-3" /> {quartoNome}
                      </span>
                      <span>·</span>
                      <span>Equipe das {alu.grupo}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-xl font-extrabold tabular-nums text-[var(--ink)]">
                      {sc >= 0 ? `+${sc}` : sc} <span className="text-xs text-[var(--ink2)] font-medium">pts</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        sc >= 3 ? 'text-[var(--ok)]' : sc >= 0 ? 'text-[var(--warn)]' : 'text-[var(--bad)]'
                      }`}
                    >
                      {sc >= 3 ? 'Elegível' : sc >= 0 ? 'Em risco' : 'Abaixo da meta'}
                    </span>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="pt-2.5 border-t border-[var(--line)] flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectAluno(alu.id)}
                    className="text-xs font-bold text-[var(--ink)] hover:text-[var(--pri-text)] flex items-center gap-1 cursor-pointer"
                  >
                    Ver perfil completo <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {currentUser?.papel !== 'aluno' && (
                    <button
                      onClick={() => onOpenAdvertencia(alu.id)}
                      className="btn sm ghost text-xs text-[var(--warn)] hover:border-[var(--warn)]"
                      title="Lançar advertência rápida"
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Advertir
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
