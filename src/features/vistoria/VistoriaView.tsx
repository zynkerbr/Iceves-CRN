import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { Quarto, Aluno, ItemVistoria } from '../../types';
import { NotaPicker, NOTAS_DEF } from '../../components/ui/NotaPicker';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import {
  aplicarTrgVistoria,
  getAcumuladorVistoria,
  calcularPesoFalha,
  getConfig
} from '../../lib/regras';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertOctagon,
  Info,
  Send,
  Bed,
  Shirt,
  Bath,
  Maximize2
} from 'lucide-react';

export function VistoriaView({ onDone }: { onDone: () => void }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [quartoSelecionado, setQuartoSelecionado] = useState<string>('');
  const [alunosQuarto, setAlunosQuarto] = useState<Aluno[]>([]);
  const [acumuladores, setAcumuladores] = useState<Record<string, number>>({});
  const [limiteVistoria, setLimiteVistoria] = useState<number>(6);
  const [submitting, setSubmitting] = useState(false);

  // Notas atribuídas nesta vistoria
  // Formato: { `${alunoId}_cama`: 5, `${alunoId}_guarda_roupa`: 4, ..., `quarto_chao`: 5, `quarto_banheiro`: 4 }
  const [notas, setNotas] = useState<Record<string, number>>({});

  useEffect(() => {
    const carregar = async () => {
      const todosQuartos = await db.quartos.toArray();
      setQuartos(todosQuartos);

      const cfg = await getConfig();
      setLimiteVistoria(cfg.limite_vistoria);

      // Pré-selecionar o quarto do monitor logado
      const inicial =
        currentUser?.quarto_id && todosQuartos.some((q) => q.id === currentUser.quarto_id)
          ? currentUser.quarto_id
          : todosQuartos[0]?.id || '';
      setQuartoSelecionado(inicial);
    };
    carregar();
  }, [currentUser]);

  // Ao mudar de quarto, carrega alunos e acumuladores
  useEffect(() => {
    if (!quartoSelecionado) return;
    const carregarAlunos = async () => {
      const alunos = await db.alunos
        .where('quarto_id')
        .equals(quartoSelecionado)
        .filter((a) => a.ativo)
        .toArray();
      setAlunosQuarto(alunos);

      // Carregar acumuladores prévios
      const acumMap: Record<string, number> = {};
      for (const alu of alunos) {
        acumMap[alu.id] = await getAcumuladorVistoria('aluno', alu.id);
      }
      acumMap['quarto'] = await getAcumuladorVistoria('quarto', quartoSelecionado);
      setAcumuladores(acumMap);

      // Inicializar notas padrão como 5 (Excelente / Padrão esperado) para agilizar o lançamento com uma mão
      const initialNotas: Record<string, number> = {};
      for (const alu of alunos) {
        initialNotas[`${alu.id}_cama`] = 5;
        initialNotas[`${alu.id}_guarda_roupa`] = 5;
      }
      initialNotas['quarto_chao'] = 5;
      initialNotas['quarto_banheiro'] = 5;
      setNotas(initialNotas);
    };
    carregarAlunos();
  }, [quartoSelecionado]);

  const handleNotaChange = (chave: string, nota: number) => {
    setNotas((prev) => ({ ...prev, [chave]: nota }));
  };

  // Calcular falhas acumuladas nesta rodada + anterior
  const getFalhaCalculada = (alvoId: string, itensKeys: string[]) => {
    const somaAnterior = acumuladores[alvoId] || 0;
    const somaNova = itensKeys.reduce((acc, k) => {
      const nota = notas[k] || 5;
      const peso = NOTAS_DEF.find((n) => n.nota === nota)?.peso || 0;
      return acc + peso;
    }, 0);
    return somaAnterior + somaNova;
  };

  const handleSalvarVistoria = async () => {
    if (!quartoSelecionado) return;
    setSubmitting(true);

    try {
      const itensEnvio: {
        aluno_id?: string | null;
        item: ItemVistoria;
        nota: number;
      }[] = [];

      // Itens por aluno (Cama e Guarda-roupa)
      for (const alu of alunosQuarto) {
        itensEnvio.push(
          { aluno_id: alu.id, item: 'cama', nota: notas[`${alu.id}_cama`] || 5 },
          { aluno_id: alu.id, item: 'guarda_roupa', nota: notas[`${alu.id}_guarda_roupa`] || 5 }
        );
      }

      // Itens coletivos do quarto
      itensEnvio.push(
        { aluno_id: null, item: 'chao', nota: notas['quarto_chao'] || 5 },
        { aluno_id: null, item: 'banheiro', nota: notas['quarto_banheiro'] || 5 }
      );

      const res = await aplicarTrgVistoria(
        quartoSelecionado,
        currentUser?.id || 'monitor',
        itensEnvio
      );

      if (res.infracoesGeradas.length > 0) {
        showToast(
          `Vistoria enviada. ${res.infracoesGeradas.length} infração(ões) gerada(s) por atingir o limite de ${limiteVistoria} falhas!`
        );
      } else {
        showToast('Vistoria enviada. Os dados foram sincronizados.');
      }

      onDone();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar vistoria.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-24">
      {/* Cabeçalho da Vistoria */}
      <div className="card border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-bold text-[var(--pri-text)] flex items-center gap-1.5 mb-1">
            <ClipboardCheck className="w-4 h-4 text-[var(--ok)]" />
            Vistoria Diária dos Dormitórios
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            Lançamento de Notas
          </h2>
          <p className="text-xs text-[var(--ink2)] mt-0.5">
            Padrão esperado: notas 4 ou 5. Notas 1, 2 ou 3 somam pesos de falha (limite: {limiteVistoria} para 1 infração).
          </p>
        </div>

        {/* Seletor de Quarto */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[var(--ink2)] whitespace-nowrap">
            Quarto:
          </label>
          <select
            value={quartoSelecionado}
            onChange={(e) => setQuartoSelecionado(e.target.value)}
            className="f text-sm font-semibold max-w-[200px]"
          >
            {quartos.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome} ({q.grupo})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Seção por Aluno */}
      <div className="flex flex-col gap-5">
        <h3 className="text-base font-bold text-[var(--ink)] flex items-center justify-between">
          <span>Itens Individuais dos Alunos</span>
          <span className="text-xs font-normal text-[var(--ink2)]">
            Cama · Guarda-roupa
          </span>
        </h3>

        {alunosQuarto.map((alu) => {
          const falhaTotal = getFalhaCalculada(alu.id, [
            `${alu.id}_cama`,
            `${alu.id}_guarda_roupa`,
          ]);
          const emRiscoFalha = falhaTotal >= 4;

          return (
            <div
              key={alu.id}
              className="card border border-[var(--line)] p-4 sm:p-5 bg-[var(--surface)] flex flex-col gap-4 shadow-xs"
            >
              {/* Header do Aluno com acumulador */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div>
                  <h4 className="font-bold text-base text-[var(--ink)]">{alu.nome}</h4>
                  <span className="text-xs text-[var(--ink2)]">Equipe dos {alu.grupo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--ink2)] font-medium">Falha acumulada:</span>
                  <Badge variant={falhaTotal >= limiteVistoria ? 'bad' : emRiscoFalha ? 'warn' : 'ok'}>
                    Soma {falhaTotal} de {limiteVistoria}
                  </Badge>
                </div>
              </div>

              {/* Itens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cama */}
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--surface2)]">
                  <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-[var(--pri-text)]" />
                    Cama e Lençol
                  </span>
                  <NotaPicker
                    value={notas[`${alu.id}_cama`]}
                    onChange={(n) => handleNotaChange(`${alu.id}_cama`, n)}
                  />
                </div>

                {/* Guarda-roupa */}
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--surface2)]">
                  <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-[var(--pri-text)]" />
                    Guarda-roupa
                  </span>
                  <NotaPicker
                    value={notas[`${alu.id}_guarda_roupa`]}
                    onChange={(n) => handleNotaChange(`${alu.id}_guarda_roupa`, n)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção Coletiva do Quarto (Chão e Banheiro) */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
            <span>Itens Coletivos do Dormitório</span>
            <span className="text-xs font-normal text-[var(--ink2)]">(Chão e Banheiro)</span>
          </h3>
          {(() => {
            const falhaQuarto = getFalhaCalculada('quarto', ['quarto_chao', 'quarto_banheiro']);
            return (
              <Badge variant={falhaQuarto >= limiteVistoria ? 'bad' : falhaQuarto >= 4 ? 'warn' : 'ok'}>
                Quarto: Soma {falhaQuarto} de {limiteVistoria}
              </Badge>
            );
          })()}
        </div>

        <div className="card border border-[var(--line)] p-4 sm:p-5 bg-[var(--surface)] grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chão */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--surface2)]">
            <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-[var(--pri-text)]" />
              Chão do Dormitório (Varrido e Passado Pano)
            </span>
            <NotaPicker
              value={notas['quarto_chao']}
              onChange={(n) => handleNotaChange('quarto_chao', n)}
            />
          </div>

          {/* Banheiro */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--surface2)]">
            <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
              <Bath className="w-3.5 h-3.5 text-[var(--pri-text)]" />
              Banheiro (Vaso, Pia e Box)
            </span>
            <NotaPicker
              value={notas['quarto_banheiro']}
              onChange={(n) => handleNotaChange('quarto_banheiro', n)}
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--surface2)] text-xs text-[var(--ink2)] flex items-start gap-2">
          <Info className="w-4 h-4 text-[var(--info)] shrink-0 mt-0.5" />
          <span>
            <strong>Atenção:</strong> Falhas graves no chão ou banheiro acumulam na conta coletiva do quarto. Se a soma do quarto atingir {limiteVistoria}, <strong>todos os alunos do dormitório</strong> recebem 1 infração de conduta.
          </span>
        </div>
      </div>

      {/* Botão de Envio (Sticky na parte inferior para mobile-first) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg z-30 flex justify-center">
        <div className="w-full max-w-3xl flex items-center justify-between gap-3">
          <div className="hidden sm:block text-xs text-[var(--ink2)]">
            Salvamento instantâneo offline com sincronização automática.
          </div>
          <button
            onClick={handleSalvarVistoria}
            disabled={submitting}
            className="btn lg font-extrabold w-full sm:w-auto px-8 cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Salvando Vistoria...' : 'Enviar vistoria'}
          </button>
        </div>
      </div>
    </div>
  );
}
