import React from 'react';

export interface NotaInfo {
  nota: number;
  label: string;
  color: string;
  peso: number;
}

export const NOTAS_DEF: NotaInfo[] = [
  { nota: 1, label: 'Péssimo', color: 'var(--nota-1)', peso: 6 },
  { nota: 2, label: 'Ruim', color: 'var(--nota-2)', peso: 3 },
  { nota: 3, label: 'Bom', color: 'var(--nota-3)', peso: 2 },
  { nota: 4, label: 'Muito bom', color: 'var(--nota-4)', peso: 0 },
  { nota: 5, label: 'Excelente', color: 'var(--nota-5)', peso: 0 },
];

export function NotaPicker({
  value,
  onChange,
  disabled = false,
  showLabel = true,
}: {
  value?: number;
  onChange: (nota: number) => void;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  const current = NOTAS_DEF.find((n) => n.nota === value);

  return (
    <div className="flex flex-col gap-2">
      <div className="nota" role="radiogroup" aria-label="Avaliação de 1 a 5">
        {NOTAS_DEF.map((n) => {
          const isSelected = value === n.nota;
          return (
            <button
              key={n.nota}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n.nota)}
              className={isSelected ? 'on' : ''}
              style={{
                backgroundColor: isSelected ? n.color : undefined,
                borderColor: isSelected ? 'transparent' : undefined,
                color: isSelected ? '#ffffff' : undefined,
              }}
              aria-label={`Nota ${n.nota} - ${n.label} (peso de falha: ${n.peso})`}
              aria-checked={isSelected}
              role="radio"
            >
              {n.nota}
            </button>
          );
        })}
      </div>
      {showLabel && (
        <div className="text-xs text-[var(--ink2)] min-h-[18px]">
          {current ? (
            <span>
              <strong className="text-[var(--ink)]">Nota {current.nota}, {current.label}.</strong>{' '}
              {current.peso > 0 ? (
                <span className="text-[var(--bad)] font-semibold">Peso de falha {current.peso}.</span>
              ) : (
                <span className="text-[var(--ok)] font-medium">Padrão esperado (sem falha).</span>
              )}
            </span>
          ) : (
            <span>Selecione uma nota de 1 a 5.</span>
          )}
        </div>
      )}
    </div>
  );
}
