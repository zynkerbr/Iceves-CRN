import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { CatalogoMotivo, Aluno } from '../../types';
import { aplicarAjustePontos } from '../../lib/regras';
import { useToast } from '../../components/ui/Toast';
import { Sparkles, Plus, Minus, X, AlertCircle } from 'lucide-react';

export function AjustarPontosModal({
  aluno,
  isOpen,
  onClose,
  onSuccess,
}: {
  aluno: Aluno | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [tipo, setTipo] = useState<'positivo' | 'negativo'>('positivo');
  const [pontosValor, setPontosValor] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>('');
  const [catalogoPontos, setCatalogoPontos] = useState<CatalogoMotivo[]>([]);
  const [motivoId, setMotivoId] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const carregar = async () => {
      const cats = await db.catalogo
        .where('tipo')
        .equals('ponto')
        .filter((c) => c.ativo)
        .toArray();
      setCatalogoPontos(cats);
    };
    carregar();
    setMotivo('');
    setHasError(false);
    setErrorMessage('');
    setPontosValor(1);
    setTipo('positivo');
  }, [isOpen]);

  if (!isOpen || !aluno) return null;

  const handleSelectCatalogo = (cat: CatalogoMotivo) => {
    setMotivoId(cat.id);
    setMotivo(cat.descricao);
    setPontosValor(cat.pontos);
    setTipo('positivo');
    setHasError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasError(false);
    setErrorMessage('');

    if (!motivo || motivo.trim() === '') {
      setHasError(true);
      setErrorMessage('Não foi possível salvar. Informe o motivo do ajuste de pontos.');
      showToast('Não foi possível salvar. Informe o motivo do ajuste de pontos.');
      return;
    }

    const valorFinal = tipo === 'positivo' ? Math.abs(pontosValor) : -Math.abs(pontosValor);

    setSubmitting(true);
    try {
      await aplicarAjustePontos(
        aluno.id,
        valorFinal,
        motivo.trim(),
        currentUser?.id || 'monitor',
        motivoId || null
      );

      showToast(`Pontos ajustados com sucesso (${valorFinal > 0 ? `+${valorFinal}` : valorFinal} pts).`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err.message || 'Erro ao ajustar pontos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="card w-full max-w-md bg-[var(--surface)] p-6 shadow-2xl border border-[var(--line)] my-8">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--pri-soft)] flex items-center justify-center text-[var(--pri-text)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--ink)]">Ajustar Pontos</h3>
              <p className="text-xs text-[var(--ink2)]">{aluno.nome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ink2)] hover:text-[var(--ink)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Seletor de Tipo (+ ou -) */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('positivo')}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                tipo === 'positivo'
                  ? 'bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok)]'
                  : 'bg-[var(--surface2)] text-[var(--ink2)] border-transparent'
              }`}
            >
              <Plus className="w-4 h-4" /> Pontos Positivos
            </button>
            <button
              type="button"
              onClick={() => setTipo('negativo')}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                tipo === 'negativo'
                  ? 'bg-[var(--bad-soft)] text-[var(--bad)] border-[var(--bad)]'
                  : 'bg-[var(--surface2)] text-[var(--ink2)] border-transparent'
              }`}
            >
              <Minus className="w-4 h-4" /> Pontos Negativos
            </button>
          </div>

          {/* Quantidade de Pontos */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink2)] uppercase mb-1">
              Quantidade de Pontos
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 5].map((pts) => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => setPontosValor(pts)}
                  className={`flex-1 py-2 rounded-lg font-extrabold text-sm border cursor-pointer ${
                    pontosValor === pts
                      ? 'bg-[var(--pri)] text-[var(--pri-ink)] border-transparent shadow-xs'
                      : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)]'
                  }`}
                >
                  {tipo === 'positivo' ? `+${pts}` : `-${pts}`}
                </button>
              ))}
            </div>
          </div>

          {/* Atalhos do Catálogo Positivo */}
          {tipo === 'positivo' && catalogoPontos.length > 0 && (
            <div>
              <span className="block text-xs font-semibold text-[var(--ink2)] mb-1.5">
                Sugestões do catálogo:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {catalogoPontos.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCatalogo(cat)}
                    className="text-xs text-left px-2.5 py-1 rounded-md bg-[var(--surface2)] hover:bg-[var(--pri-soft)] hover:text-[var(--pri-text)] text-[var(--ink)] cursor-pointer truncate max-w-full"
                  >
                    +{cat.pontos} {cat.descricao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Motivo OBRIGATÓRIO com animação shake em erro */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink2)] uppercase mb-1 flex items-center justify-between">
              <span>Motivo do Ajuste *</span>
              <span className="text-[11px] text-[var(--bad)] font-semibold">Obrigatório</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setHasError(false);
              }}
              placeholder="Descreva a razão detalhada do ajuste de pontos..."
              className={`f ${hasError ? 'err' : ''}`}
              rows={3}
              required
            />
          </div>

          {hasError && (
            <div className="p-2.5 rounded-lg bg-[var(--bad-soft)] text-[var(--bad)] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
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
              {submitting ? 'Salvando...' : 'Salvar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
