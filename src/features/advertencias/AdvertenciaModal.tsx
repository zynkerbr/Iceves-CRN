import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { Aluno, CatalogoMotivo, Advertencia } from '../../types';
import { aplicarTrgAdvertencia, getConfig } from '../../lib/regras';
import { useToast } from '../../components/ui/Toast';
import { AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export function AdvertenciaModal({
  alunoIdInicial,
  isOpen,
  onClose,
  onSuccess,
}: {
  alunoIdInicial?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoMotivo[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>(alunoIdInicial || '');
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [advertenciasAtuais, setAdvertenciasAtuais] = useState<Advertencia[]>([]);
  const [porInfracao, setPorInfracao] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const carregar = async () => {
      const todosAlunos = await db.alunos.where('ativo').equals(1).toArray();
      // Filtrar conforme monitoria se for monitor
      let permitidos = todosAlunos;
      if (currentUser?.papel === 'monitor' && currentUser.quarto_id) {
        permitidos = todosAlunos.filter((a) => a.quarto_id === currentUser.quarto_id);
      }
      setAlunos(permitidos);

      const cats = await db.catalogo
        .where('tipo')
        .equals('advertencia')
        .filter((c) => c.ativo)
        .toArray();
      setCatalogo(cats);
      if (cats.length > 0 && !motivoSelecionado) {
        setMotivoSelecionado(cats[0].id);
      }

      const cfg = await getConfig();
      setPorInfracao(cfg.advertencias_por_infracao);

      const alvo = alunoIdInicial || permitidos[0]?.id || '';
      setAlunoSelecionado(alvo);
    };

    carregar();
  }, [isOpen, alunoIdInicial, currentUser]);

  // Carregar histórico de advertências sem infração do aluno selecionado
  useEffect(() => {
    if (!alunoSelecionado) {
      setAdvertenciasAtuais([]);
      return;
    }

    const checkAdvs = async () => {
      const advs = await db.advertencias
        .where('aluno_id')
        .equals(alunoSelecionado)
        .filter((a) => !a.infracao_id)
        .toArray();
      setAdvertenciasAtuais(advs);
    };
    checkAdvs();
  }, [alunoSelecionado]);

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoSelecionado) return;
    setSubmitting(true);

    try {
      const motObj = catalogo.find((c) => c.id === motivoSelecionado);
      const res = await aplicarTrgAdvertencia(
        alunoSelecionado,
        currentUser?.id || 'monitor',
        motivoSelecionado,
        motObj?.descricao,
        observacao
      );

      if (res.gerouInfracao) {
        showToast('Advertência registrada. 3 advertências acumuladas geraram 1 infração de conduta!');
      } else {
        showToast('Advertência registrada com sucesso (-1 no score).');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar advertência.');
    } finally {
      setSubmitting(false);
    }
  };

  const alunoObj = alunos.find((a) => a.id === alunoSelecionado);
  const totalSemInf = advertenciasAtuais.length;
  const proximaGeraInfracao = totalSemInf + 1 >= porInfracao;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="card w-full max-w-lg bg-[var(--surface)] p-6 shadow-2xl border border-[var(--line)] my-8">
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--warn-soft)] flex items-center justify-center text-[var(--warn)]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)]">Lançar Advertência</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ink2)] hover:text-[var(--ink)] hover:bg-[var(--surface2)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="flex flex-col gap-4">
          {/* Selecionar Aluno */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink2)] uppercase mb-1">
              Aluno
            </label>
            <select
              value={alunoSelecionado}
              onChange={(e) => setAlunoSelecionado(e.target.value)}
              className="f"
              required
            >
              {alunos.map((alu) => (
                <option key={alu.id} value={alu.id}>
                  {alu.nome} ({alu.grupo})
                </option>
              ))}
            </select>
          </div>

          {/* Status Acumulado do Aluno */}
          <div className={`p-3 rounded-lg border text-xs ${
            proximaGeraInfracao
              ? 'bg-[var(--bad-soft)] border-[var(--bad)]/30 text-[var(--bad)] font-semibold'
              : 'bg-[var(--surface2)] border-[var(--line)] text-[var(--ink)]'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span>Situação acumulada do aluno:</span>
              <Badge variant={proximaGeraInfracao ? 'bad' : totalSemInf > 0 ? 'warn' : 'ok'}>
                {totalSemInf} de {porInfracao} advertências
              </Badge>
            </div>
            {proximaGeraInfracao ? (
              <p className="text-[11px] font-bold">
                Atenção: Este lançamento completará {porInfracao} advertências e gerará automaticamente <strong>1 infração de conduta</strong>.
              </p>
            ) : (
              <p className="text-[11px] text-[var(--ink2)]">
                Cada advertência gera -1 ponto no score do aluno.
              </p>
            )}
          </div>

          {/* Motivo do Catálogo Fechado */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink2)] uppercase mb-1">
              Motivo (Catálogo do Internato)
            </label>
            <select
              value={motivoSelecionado}
              onChange={(e) => setMotivoSelecionado(e.target.value)}
              className="f text-sm font-medium"
              required
            >
              {catalogo.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.descricao} (-1 pt)
                </option>
              ))}
            </select>
          </div>

          {/* Observação Adicional */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink2)] uppercase mb-1">
              Observação / Detalhamento (Opcional)
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Cama com lençol desarrumado durante a inspeção das 12:45."
              className="f"
              rows={3}
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)] mt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn ghost sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn font-bold cursor-pointer"
            >
              {submitting ? 'Registrando...' : 'Lançar advertência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
