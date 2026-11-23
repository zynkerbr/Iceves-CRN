import { ChartConfig } from '../chart';

export interface ChartPoint {
  periodo: string;
  vistorias: number;
  ocorrencias: number;
}

export const icevesChartConfig: ChartConfig = {
  vistorias: {
    label: 'Vistorias Concluídas',
    color: 'var(--pri)',
  },
  ocorrencias: {
    label: 'Ocorrências & Advertências',
    color: '#F43F5E',
  },
};

// Dados para os 3 filtros de tempo (12 meses, 30 dias, 1 semana)
export const chartData12m: ChartPoint[] = [
  { periodo: 'Jan', vistorias: 42, ocorrencias: 8 },
  { periodo: 'Fev', vistorias: 55, ocorrencias: 12 },
  { periodo: 'Mar', vistorias: 68, ocorrencias: 9 },
  { periodo: 'Abr', vistorias: 60, ocorrencias: 14 },
  { periodo: 'Mai', vistorias: 74, ocorrencias: 7 },
  { periodo: 'Jun', vistorias: 82, ocorrencias: 11 },
  { periodo: 'Jul', vistorias: 48, ocorrencias: 5 },
  { periodo: 'Ago', vistorias: 78, ocorrencias: 16 },
  { periodo: 'Set', vistorias: 85, ocorrencias: 18 },
  { periodo: 'Out', vistorias: 92, ocorrencias: 13 },
  { periodo: 'Nov', vistorias: 95, ocorrencias: 6 },
  { periodo: 'Dez', vistorias: 88, ocorrencias: 8 },
];

export const chartData30d: ChartPoint[] = [
  { periodo: '04 Out', vistorias: 18, ocorrencias: 4 },
  { periodo: '11 Out', vistorias: 24, ocorrencias: 2 },
  { periodo: '18 Out', vistorias: 22, ocorrencias: 5 },
  { periodo: '25 Out', vistorias: 28, ocorrencias: 3 },
  { periodo: '01 Nov', vistorias: 30, ocorrencias: 2 },
  { periodo: '03 Nov', vistorias: 26, ocorrencias: 1 },
];

export const chartData1w: ChartPoint[] = [
  { periodo: 'Seg', vistorias: 4, ocorrencias: 1 },
  { periodo: 'Ter', vistorias: 5, ocorrencias: 0 },
  { periodo: 'Qua', vistorias: 4, ocorrencias: 2 },
  { periodo: 'Qui', vistorias: 6, ocorrencias: 0 },
  { periodo: 'Sex', vistorias: 5, ocorrencias: 1 },
  { periodo: 'Sáb', vistorias: 6, ocorrencias: 0 },
  { periodo: 'Dom', vistorias: 4, ocorrencias: 0 },
];

export interface DashboardStats {
  quartosTotal: number;
  vistoriasHoje: number;
  taxaVistoriasHoje: number;
  escalasAtivasPct: number;
  conformidadeGeralPct: number;
  aptosPasseioPct: number;
  ocorrenciasMes: number;
  diasCiclo: number;
  assiduidadePct: number;
  mediaCasa: number;
  alunosPendentesCount: number;
  resumoTriagem: number;
  resumoRegulares: number;
  resumoAtencao: number;
  pctAptos: number;
  pctAlerta: number;
  pctDisciplina: number;
}
