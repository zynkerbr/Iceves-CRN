import React, { useState } from 'react';

interface DataPoint {
  label: string;
  vistorias: number;
  falhas: number;
  highlight?: boolean;
  tooltipText?: string;
}

const DATA_PERIODS: Record<string, DataPoint[]> = {
  '30 dias': [
    { label: '24 Out', vistorias: 18, falhas: 4 },
    { label: '31 Out', vistorias: 25, falhas: 7 },
    { label: '7 Nov', vistorias: 32, falhas: 1, highlight: true, tooltipText: '7 de Novembro · 32 vistorias, 1 falha' },
    { label: '14 Nov', vistorias: 22, falhas: 5 },
    { label: '21 Nov', vistorias: 28, falhas: 3 },
    { label: '28 Nov', vistorias: 30, falhas: 2 },
  ],
  '1 semana': [
    { label: 'Seg', vistorias: 4, falhas: 1 },
    { label: 'Ter', vistorias: 5, falhas: 0 },
    { label: 'Qua', vistorias: 6, falhas: 2, highlight: true, tooltipText: 'Quarta-feira · 6 vistorias, 2 advertências' },
    { label: 'Qui', vistorias: 4, falhas: 0 },
    { label: 'Sex', vistorias: 5, falhas: 1 },
    { label: 'Sáb', vistorias: 6, falhas: 0 },
    { label: 'Dom', vistorias: 4, falhas: 0 },
  ],
  '12 meses': [
    { label: 'Jan', vistorias: 90, falhas: 22 },
    { label: 'Mar', vistorias: 110, falhas: 18 },
    { label: 'Mai', vistorias: 125, falhas: 12 },
    { label: 'Jul', vistorias: 140, falhas: 8, highlight: true, tooltipText: 'Julho · 140 vistorias, 8 falhas' },
    { label: 'Set', vistorias: 130, falhas: 15 },
    { label: 'Nov', vistorias: 145, falhas: 6 },
  ],
};

export function CrmInteractiveChart() {
  const [period, setPeriod] = useState<'12 meses' | '30 dias' | '1 semana'>('30 dias');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const data = DATA_PERIODS[period];
  const maxVal = Math.max(...data.flatMap((d) => [d.vistorias, d.falhas])) * 1.25;

  // SVG coordinates math
  const width = 640;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const pointsVistorias = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartW;
    const y = paddingY + chartH - (d.vistorias / maxVal) * chartH;
    return { x, y, data: d };
  });

  const pointsFalhas = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartW;
    const y = paddingY + chartH - (d.falhas / maxVal) * chartH;
    return { x, y, data: d };
  });

  // Generate smooth SVG curve using Catmull-Rom or cubic Bezier
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const pathVistorias = createSmoothPath(pointsVistorias);
  const pathFalhas = createSmoothPath(pointsFalhas);

  const activeHover = hoveredPoint || data.find((d) => d.highlight) || data[2];
  const activePt = pointsVistorias.find((p) => p.data.label === activeHover.label) || pointsVistorias[2];

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header do Gráfico */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] tracking-tight">
            Frequência de Vistorias e Ocorrências
          </h3>
          <p className="text-[11px] text-[var(--ink2)]">
            Acompanhamento diário nos dormitórios e taxa de conformidade
          </p>
        </div>

        {/* Seletor de Período da Referência: 12 months, 30 days, 1 week */}
        <div className="seg text-xs">
          {(['12 meses', '30 dias', '1 semana'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriod(p);
                setHoveredPoint(null);
              }}
              className={`px-2.5 py-1 text-xs cursor-pointer ${period === p ? 'on' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas com Tooltip Flutuante estilo Referência */}
      <div className="relative w-full h-[180px] select-none">
        {/* Tooltip flutuante no ponto de destaque */}
        {activePt && (
          <div
            className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] shadow-md text-[11px] pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(activePt.x / width) * 100}%`,
              top: `${Math.max(10, activePt.y - 12)}px`,
            }}
          >
            <span className="font-bold block text-[var(--ink)] whitespace-nowrap">
              {activeHover.label}
            </span>
            <span className="text-[var(--pri-text)] font-semibold block whitespace-nowrap">
              {activeHover.vistorias} vistorias realizadas
            </span>
            <span className="text-[var(--warn)] text-[10px] block whitespace-nowrap">
              {activeHover.falhas} falha(s) registrada(s)
            </span>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="gradVistorias" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pri)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--pri)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradFalhas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--warn)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--warn)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines sutis horizontais */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={paddingX}
              y1={paddingY + chartH * ratio}
              x2={width - paddingX}
              y2={paddingY + chartH * ratio}
              stroke="var(--line)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}

          {/* Linha vertical de foco */}
          {activePt && (
            <line
              x1={activePt.x}
              y1={paddingY}
              x2={activePt.x}
              y2={paddingY + chartH}
              stroke="var(--pri)"
              strokeDasharray="2 2"
              strokeWidth="1"
              opacity="0.6"
            />
          )}

          {/* Curva 1: Vistorias Realizadas (Verde/Lima do Design System) */}
          <path
            d={pathVistorias}
            fill="none"
            stroke="var(--pri-text)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Curva 2: Falhas / Ocorrências (Âmbar/Atenção do Design System) */}
          <path
            d={pathFalhas}
            fill="none"
            stroke="var(--warn)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Pontos interativos das vistorias */}
          {pointsVistorias.map((pt, i) => {
            const isHovered = activeHover.label === pt.data.label;
            return (
              <g key={`v-${i}`} className="cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 3.5}
                  fill="var(--surface)"
                  stroke="var(--pri-text)"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150"
                  onMouseEnter={() => setHoveredPoint(pt.data)}
                />
              </g>
            );
          })}

          {/* Rótulos do Eixo X */}
          {pointsVistorias.map((pt, i) => (
            <text
              key={`label-${i}`}
              x={pt.x}
              y={height - 4}
              fontSize="10"
              fontFamily="var(--f-ui)"
              fontWeight="500"
              fill="var(--ink2)"
              textAnchor="middle"
            >
              {pt.data.label}
            </text>
          ))}
        </svg>
      </div>

      {/* Legenda Discreta no Rodapé */}
      <div className="flex items-center justify-between text-[11px] text-[var(--ink2)] pt-2 border-t border-[var(--line)] mt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--pri-text)] inline-block" />
            Vistorias realizadas
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--warn)] inline-block" />
            Falhas leves / Advertências
          </span>
        </div>
        <span className="hidden sm:inline italic text-[10px]">
          Passe o mouse ou toque nos pontos para ver os valores.
        </span>
      </div>
    </div>
  );
}
