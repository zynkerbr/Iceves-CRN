export type Papel = 'aluno' | 'monitor' | 'preceptor' | 'direcao';
export type Grupo = 'meninos' | 'meninas';
export type SetorEquipe = 'cozinha' | 'limpeza_geral';
export type ItemVistoria = 'cama' | 'guarda_roupa' | 'cestos' | 'chao' | 'banheiro';
export type Presenca = 'pendente' | 'presente' | 'atrasado' | 'ausente';
export type TopicoInfracao = 'quarto' | 'atraso' | 'falta' | 'setor' | 'conduta' | 'outro';
export type OrigemInfracao = 'advertencias' | 'vistoria' | 'atraso' | 'falta' | 'direto';

export interface Perfil {
  id: string;
  nome: string;
  papel: Papel;
  aluno_id?: string | null;
  email: string;
  avatar?: string;
  quarto_id?: string | null;
}

export interface Quarto {
  id: string;
  nome: string;
  grupo: Grupo;
  monitor_id?: string | null;
  fora_do_rodizio?: boolean;
  ordem?: number;
}

export interface Aluno {
  id: string;
  nome: string;
  nascimento?: string;
  grupo: Grupo;
  quarto_id?: string | null;
  ativo: boolean;
  em_disciplina: boolean;
  criado_em: string;
}

export interface Mes {
  id: string;
  ano: number;
  mes: number;
  grupo: Grupo;
  inicio: string;
  fim: string;
}

export interface AlocacaoSetor {
  id: string;
  mes_id: string;
  aluno_id: string;
  setor: SetorEquipe;
}

export interface EscalaDormitorio {
  data: string;
  quarto_id: string;
  limpa: boolean;
}

export interface AppConfig {
  pesos_nota: Record<number, number>;
  limite_vistoria: number;
  zerar_soma_apos_infracao: boolean;
  advertencias_por_infracao: number;
  infracoes_para_disciplina: number;
  alerta_na_infracao: number;
  limite_diario_pontos_positivos: number;
  infracao_atraso: number;
  infracao_falta: number;
  equipe_do_mes_no_rodizio: boolean;
}

export interface Vistoria {
  id: string;
  data: string;
  quarto_id: string;
  monitor_id: string;
  criado_em: string;
}

export interface VistoriaItem {
  id: string;
  vistoria_id: string;
  aluno_id?: string | null; // null se for chão ou banheiro (quarto todo)
  item: ItemVistoria;
  nota: number; // 1 a 5
  peso_falha: number;
}

export interface AcumuladorVistoria {
  alvo: 'aluno' | 'quarto';
  alvo_id: string;
  soma: number;
}

export interface CatalogoMotivo {
  id: string;
  tipo: 'advertencia' | 'ponto';
  descricao: string;
  pontos: number;
  ativo: boolean;
}

export interface Advertencia {
  id: string;
  aluno_id: string;
  motivo_id?: string | null;
  motivo_descricao?: string;
  monitor_id: string;
  data: string;
  obs?: string;
  infracao_id?: string | null;
  criado_em: string;
}

export interface Infracao {
  id: string;
  aluno_id: string;
  topico: TopicoInfracao;
  origem: OrigemInfracao;
  descricao: string;
  data: string;
  autor_id?: string;
  criado_em: string;
}

export interface Disciplina {
  id: string;
  aluno_id: string;
  trabalho_tipo?: string;
  trabalho_quantidade?: string;
  prazo?: string;
  responsavel_id?: string;
  status: 'pendente' | 'cumprida';
  criada_em: string;
  cumprida_em?: string;
}

export interface LancamentoPonto {
  id: string;
  aluno_id: string;
  valor: number;
  motivo_id?: string | null;
  motivo: string;
  autor_id: string;
  data: string;
  criado_em: string;
  contestacao?: string;
  contestacao_status?: 'aberta' | 'aceita' | 'negada';
  decidido_por?: string;
}

export interface ObservacaoSensivel {
  id: string;
  aluno_id: string;
  texto: string;
  autor_id: string;
  criado_em: string;
}

export interface PeriodoMeta {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  meta_media: number;
  presenca_minima: number;
}

export interface Notificacao {
  id: string;
  destino_papel?: Papel;
  destino_id?: string;
  mensagem: string;
  lida: boolean;
  criada_em: string;
}

export interface Auditoria {
  id: number | string;
  tabela: string;
  registro_id: string;
  acao: string;
  usuario_id: string;
  antes?: any;
  depois?: any;
  em: string;
}

export interface AcessoSensivel {
  id: number | string;
  usuario_id: string;
  aluno_id: string;
  recurso: string;
  em: string;
}

export interface OutboxItem {
  id: string;
  acao: 'inserir' | 'atualizar' | 'remover';
  tabela: string;
  payload: any;
  criado_em: number;
  tentativas: number;
  erro?: string;
}
