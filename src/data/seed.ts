import {
  Aluno,
  Quarto,
  Perfil,
  CatalogoMotivo,
  AppConfig,
  Mes,
  AlocacaoSetor,
  PeriodoMeta,
  Vistoria,
  VistoriaItem,
  Advertencia,
  Infracao,
  LancamentoPonto
} from '../types';

export const SEED_CONFIG: AppConfig = {
  pesos_nota: { 1: 6, 2: 3, 3: 2, 4: 0, 5: 0 },
  limite_vistoria: 6,
  zerar_soma_apos_infracao: true,
  advertencias_por_infracao: 3,
  infracoes_para_disciplina: 3,
  alerta_na_infracao: 2,
  limite_diario_pontos_positivos: 5,
  infracao_atraso: 1,
  infracao_falta: 2,
  equipe_do_mes_no_rodizio: false,
};

export const SEED_QUARTOS: Quarto[] = [
  {
    id: 'quarto-101',
    nome: 'Dormitório 101',
    grupo: 'meninos',
    monitor_id: 'perfil-monitor-1',
    fora_do_rodizio: false,
    ordem: 1,
  },
  {
    id: 'quarto-201',
    nome: 'Dormitório 201',
    grupo: 'meninas',
    monitor_id: 'perfil-monitor-2',
    fora_do_rodizio: false,
    ordem: 2,
  },
];

export const SEED_ALUNOS: Aluno[] = [
  {
    id: 'aluno-a',
    nome: 'Aluno Exemplo A',
    nascimento: '2008-03-15',
    grupo: 'meninos',
    quarto_id: 'quarto-101',
    ativo: true,
    em_disciplina: false,
    criado_em: '2026-02-01T08:00:00Z',
  },
  {
    id: 'aluno-b',
    nome: 'Aluno Exemplo B',
    nascimento: '2008-07-22',
    grupo: 'meninos',
    quarto_id: 'quarto-101',
    ativo: true,
    em_disciplina: false,
    criado_em: '2026-02-01T08:00:00Z',
  },
  {
    id: 'aluno-c',
    nome: 'Aluno Exemplo C',
    nascimento: '2007-11-09',
    grupo: 'meninos',
    quarto_id: 'quarto-101',
    ativo: true,
    em_disciplina: false,
    criado_em: '2026-02-01T08:00:00Z',
  },
  {
    id: 'aluno-d',
    nome: 'Aluno Exemplo D',
    nascimento: '2008-01-30',
    grupo: 'meninas',
    quarto_id: 'quarto-201',
    ativo: true,
    em_disciplina: false,
    criado_em: '2026-02-01T08:00:00Z',
  },
  {
    id: 'aluno-e',
    nome: 'Aluno Exemplo E',
    nascimento: '2008-09-18',
    grupo: 'meninas',
    quarto_id: 'quarto-201',
    ativo: true,
    em_disciplina: false,
    criado_em: '2026-02-01T08:00:00Z',
  },
  {
    id: 'aluno-f',
    nome: 'Aluno Exemplo F',
    nascimento: '2007-05-12',
    grupo: 'meninas',
    quarto_id: 'quarto-201',
    ativo: true,
    em_disciplina: false,
    criado_em: '2026-02-01T08:00:00Z',
  },
];

export const SEED_PERFIS: Perfil[] = [
  {
    id: 'perfil-direcao',
    nome: 'Direção Exemplo',
    papel: 'direcao',
    email: 'direcao@iceves.edu.br',
  },
  {
    id: 'perfil-preceptor',
    nome: 'Preceptor Exemplo',
    papel: 'preceptor',
    email: 'preceptor@iceves.edu.br',
  },
  {
    id: 'perfil-monitor-1',
    nome: 'Monitor Exemplo 1',
    papel: 'monitor',
    email: 'monitor1@iceves.edu.br',
    quarto_id: 'quarto-101',
  },
  {
    id: 'perfil-monitor-2',
    nome: 'Monitor Exemplo 2',
    papel: 'monitor',
    email: 'monitor2@iceves.edu.br',
    quarto_id: 'quarto-201',
  },
  {
    id: 'perfil-aluno-a',
    nome: 'Aluno Exemplo A',
    papel: 'aluno',
    aluno_id: 'aluno-a',
    email: 'aluno.a@iceves.edu.br',
    quarto_id: 'quarto-101',
  },
  {
    id: 'perfil-aluno-b',
    nome: 'Aluno Exemplo B',
    papel: 'aluno',
    aluno_id: 'aluno-b',
    email: 'aluno.b@iceves.edu.br',
    quarto_id: 'quarto-101',
  },
  {
    id: 'perfil-aluno-d',
    nome: 'Aluno Exemplo D',
    papel: 'aluno',
    aluno_id: 'aluno-d',
    email: 'aluno.d@iceves.edu.br',
    quarto_id: 'quarto-201',
  },
];

export const SEED_CATALOGO: CatalogoMotivo[] = [
  // Advertências
  { id: 'cat-adv-1', tipo: 'advertencia', descricao: 'Cama desarrumada ou lençol frouxo', pontos: -1, ativo: true },
  { id: 'cat-adv-2', tipo: 'advertencia', descricao: 'Atraso na escala matutina (5h às 6h)', pontos: -1, ativo: true },
  { id: 'cat-adv-3', tipo: 'advertencia', descricao: 'Uso de celular fora do horário permitido', pontos: -1, ativo: true },
  { id: 'cat-adv-4', tipo: 'advertencia', descricao: 'Objeto ou calçado fora do local padrão no quarto', pontos: -1, ativo: true },
  { id: 'cat-adv-5', tipo: 'advertencia', descricao: 'Conversa no dormitório após o toque de silêncio', pontos: -1, ativo: true },
  { id: 'cat-adv-6', tipo: 'advertencia', descricao: 'Desatenção ou falta de cuidado na escala de limpeza', pontos: -1, ativo: true },

  // Pontos
  { id: 'cat-pts-1', tipo: 'ponto', descricao: 'Iniciativa exemplar na limpeza e organização', pontos: 1, ativo: true },
  { id: 'cat-pts-2', tipo: 'ponto', descricao: 'Ajuda voluntária e prestatividade a colega de quarto', pontos: 1, ativo: true },
  { id: 'cat-pts-3', tipo: 'ponto', descricao: 'Pontualidade impecável durante toda a semana', pontos: 2, ativo: true },
  { id: 'cat-pts-4', tipo: 'ponto', descricao: 'Participação ativa e dedicação no coral', pontos: 1, ativo: true },
  { id: 'cat-pts-5', tipo: 'ponto', descricao: 'Cuidado e ordem impecáveis na vistoria do dormitório', pontos: 1, ativo: true },
  { id: 'cat-pts-6', tipo: 'ponto', descricao: 'Liderança positiva e serviço comunitário no internato', pontos: 3, ativo: true },
];

export const SEED_MES: Mes = {
  id: 'mes-atual',
  ano: 2026,
  mes: 11,
  grupo: 'meninos', // Equipe do mês atual: meninos (responsável por cozinha e limpeza geral)
  inicio: '2026-11-01',
  fim: '2026-11-30',
};

export const SEED_ALOCACOES_SETOR: AlocacaoSetor[] = [
  { id: 'aloc-1', mes_id: 'mes-atual', aluno_id: 'aluno-a', setor: 'cozinha' },
  { id: 'aloc-2', mes_id: 'mes-atual', aluno_id: 'aluno-b', setor: 'cozinha' },
  { id: 'aloc-3', mes_id: 'mes-atual', aluno_id: 'aluno-c', setor: 'limpeza_geral' },
];

export const SEED_PERIODO_META: PeriodoMeta = {
  id: 'periodo-meta-1',
  nome: 'Passeio do Mês de Novembro',
  inicio: '2026-11-01',
  fim: '2026-11-30',
  meta_media: 4.0,
  presenca_minima: 0.75,
};

export const SEED_VISTORIAS: Vistoria[] = [
  {
    id: 'vistoria-101-hoje',
    data: new Date().toISOString().slice(0, 10),
    quarto_id: 'quarto-101',
    monitor_id: 'perfil-monitor-1',
    criado_em: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'vistoria-201-ontem',
    data: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    quarto_id: 'quarto-201',
    monitor_id: 'perfil-monitor-2',
    criado_em: new Date(Date.now() - 86400000 - 3600000).toISOString(),
  },
];

export const SEED_VISTORIA_ITENS: VistoriaItem[] = [
  { id: 'vi-1', vistoria_id: 'vistoria-101-hoje', aluno_id: 'aluno-a', item: 'cama', nota: 4, peso_falha: 0 },
  { id: 'vi-2', vistoria_id: 'vistoria-101-hoje', aluno_id: 'aluno-a', item: 'guarda_roupa', nota: 5, peso_falha: 0 },
  { id: 'vi-3', vistoria_id: 'vistoria-101-hoje', aluno_id: 'aluno-b', item: 'cama', nota: 5, peso_falha: 0 },
  { id: 'vi-4', vistoria_id: 'vistoria-101-hoje', aluno_id: null, item: 'banheiro', nota: 5, peso_falha: 0 },
  { id: 'vi-5', vistoria_id: 'vistoria-101-hoje', aluno_id: null, item: 'chao', nota: 5, peso_falha: 0 },
];

export const SEED_ADVERTENCIAS: Advertencia[] = [
  {
    id: 'adv-seed-1',
    aluno_id: 'aluno-a',
    motivo_id: 'cat-adv-1',
    motivo_descricao: 'Cama desarrumada ou lençol frouxo',
    monitor_id: 'perfil-monitor-1',
    data: new Date().toISOString().slice(0, 10),
    obs: 'Lençol frouxo e cobertor torto na vistoria das 12:45.',
    infracao_id: null,
    criado_em: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'adv-seed-2',
    aluno_id: 'aluno-b',
    motivo_id: 'cat-adv-2',
    motivo_descricao: 'Atraso na escala matutina (5h às 6h)',
    monitor_id: 'perfil-monitor-1',
    data: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    obs: 'Chegou às 5h18 na copa do refeitório.',
    infracao_id: null,
    criado_em: new Date(Date.now() - 86400000 - 7200000).toISOString(),
  },
  {
    id: 'adv-seed-3',
    aluno_id: 'aluno-d',
    motivo_id: 'cat-adv-4',
    motivo_descricao: 'Objeto ou calçado fora do local padrão no quarto',
    monitor_id: 'perfil-monitor-2',
    data: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    obs: 'Calçados deixados fora da sapateira padrão.',
    infracao_id: null,
    criado_em: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const SEED_INFRACOES: Infracao[] = [
  {
    id: 'inf-seed-1',
    aluno_id: 'aluno-c',
    topico: 'atraso',
    origem: 'atraso',
    descricao: 'Reincidência em atraso grave no plantão matinal de limpeza',
    data: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    autor_id: 'perfil-preceptor',
    criado_em: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const SEED_LANCAMENTOS_PONTOS: LancamentoPonto[] = [
  {
    id: 'lp-seed-1',
    aluno_id: 'aluno-a',
    valor: 1,
    motivo_id: 'cat-pts-1',
    motivo: 'Iniciativa exemplar na limpeza e organização',
    autor_id: 'perfil-monitor-1',
    data: new Date().toISOString().slice(0, 10),
    criado_em: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'lp-seed-2',
    aluno_id: 'aluno-b',
    valor: 2,
    motivo_id: 'cat-pts-3',
    motivo: 'Pontualidade impecável durante toda a semana',
    autor_id: 'perfil-monitor-1',
    data: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    criado_em: new Date(Date.now() - 86400000 - 3600000).toISOString(),
  },
  {
    id: 'lp-seed-3',
    aluno_id: 'aluno-d',
    valor: 1,
    motivo_id: 'cat-pts-4',
    motivo: 'Participação ativa e dedicação no coral',
    autor_id: 'perfil-preceptor',
    data: new Date().toISOString().slice(0, 10),
    criado_em: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'lp-seed-4',
    aluno_id: 'aluno-e',
    valor: 3,
    motivo_id: 'cat-pts-6',
    motivo: 'Liderança positiva e serviço comunitário no internato',
    autor_id: 'perfil-direcao',
    data: new Date().toISOString().slice(0, 10),
    criado_em: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];
