import Dexie, { type Table } from 'dexie';
import {
  Perfil,
  Quarto,
  Aluno,
  Vistoria,
  VistoriaItem,
  AcumuladorVistoria,
  CatalogoMotivo,
  Advertencia,
  Infracao,
  Disciplina,
  LancamentoPonto,
  ObservacaoSensivel,
  Notificacao,
  Auditoria,
  AcessoSensivel,
  OutboxItem,
  AppConfig,
  EscalaDormitorio,
  AlocacaoSetor,
  Mes
} from '../types';
import {
  SEED_ALUNOS,
  SEED_CATALOGO,
  SEED_CONFIG,
  SEED_PERFIS,
  SEED_QUARTOS,
  SEED_MES,
  SEED_ALOCACOES_SETOR,
  SEED_VISTORIAS,
  SEED_VISTORIA_ITENS,
  SEED_ADVERTENCIAS,
  SEED_INFRACOES,
  SEED_LANCAMENTOS_PONTOS
} from '../data/seed';

export class IcevesDatabase extends Dexie {
  perfis!: Table<Perfil, string>;
  quartos!: Table<Quarto, string>;
  alunos!: Table<Aluno, string>;
  vistorias!: Table<Vistoria, string>;
  vistoria_itens!: Table<VistoriaItem, string>;
  acumuladores!: Table<AcumuladorVistoria, string>; // key: `${alvo}:${alvo_id}`
  catalogo!: Table<CatalogoMotivo, string>;
  advertencias!: Table<Advertencia, string>;
  infracoes!: Table<Infracao, string>;
  disciplinas!: Table<Disciplina, string>;
  lancamentos_pontos!: Table<LancamentoPonto, string>;
  observacoes_sensiveis!: Table<ObservacaoSensivel, string>;
  notificacoes!: Table<Notificacao, string>;
  auditoria!: Table<Auditoria, number>;
  acessos_sensiveis!: Table<AcessoSensivel, number>;
  outbox!: Table<OutboxItem, string>;
  config!: Table<{ chave: string; valor: any }, string>;
  escalas!: Table<EscalaDormitorio, string>;
  alocacoes!: Table<AlocacaoSetor, string>;
  meses!: Table<Mes, string>;

  constructor() {
    super('IcevesCRM_DB');
    this.version(1).stores({
      perfis: 'id, papel, aluno_id, email',
      quartos: 'id, grupo, monitor_id',
      alunos: 'id, grupo, quarto_id, ativo, em_disciplina',
      vistorias: 'id, data, quarto_id, monitor_id, criado_em',
      vistoria_itens: 'id, vistoria_id, aluno_id, item',
      acumuladores: 'alvo_id, alvo',
      catalogo: 'id, tipo, ativo',
      advertencias: 'id, aluno_id, infracao_id, data, criado_em',
      infracoes: 'id, aluno_id, topico, origem, data, criado_em',
      disciplinas: 'id, aluno_id, status',
      lancamentos_pontos: 'id, aluno_id, data, contestacao_status, criado_em',
      observacoes_sensiveis: 'id, aluno_id, autor_id',
      notificacoes: 'id, destino_papel, destino_id, lida, criada_em',
      auditoria: '++id, tabela, registro_id, usuario_id, em',
      acessos_sensiveis: '++id, usuario_id, aluno_id, recurso, em',
      outbox: 'id, tabela, acao, criado_em',
      config: 'chave',
      escalas: '[data+quarto_id], data, quarto_id',
      alocacoes: 'id, mes_id, aluno_id, setor',
      meses: 'id, ano, mes, grupo'
    });

    this.version(2).stores({
      advertencias: 'id, aluno_id, infracao_id, data, criado_em',
      infracoes: 'id, aluno_id, topico, origem, data, criado_em',
      lancamentos_pontos: 'id, aluno_id, data, contestacao_status, criado_em',
      vistorias: 'id, data, quarto_id, monitor_id, criado_em',
    });
  }

  async seedIfEmpty() {
    const countAlunos = await this.alunos.count();
    if (countAlunos === 0) {
      await this.transaction('rw', [
        this.perfis,
        this.quartos,
        this.alunos,
        this.catalogo,
        this.config,
        this.meses,
        this.alocacoes,
        this.vistorias,
        this.vistoria_itens,
        this.advertencias,
        this.infracoes,
        this.lancamentos_pontos
      ], async () => {
        await this.perfis.bulkAdd(SEED_PERFIS);
        await this.quartos.bulkAdd(SEED_QUARTOS);
        await this.alunos.bulkAdd(SEED_ALUNOS);
        await this.catalogo.bulkAdd(SEED_CATALOGO);
        await this.meses.add(SEED_MES);
        await this.alocacoes.bulkAdd(SEED_ALOCACOES_SETOR);
        await this.config.put({ chave: 'app_config', valor: SEED_CONFIG });
        await this.vistorias.bulkAdd(SEED_VISTORIAS);
        await this.vistoria_itens.bulkAdd(SEED_VISTORIA_ITENS);
        await this.advertencias.bulkAdd(SEED_ADVERTENCIAS);
        await this.infracoes.bulkAdd(SEED_INFRACOES);
        await this.lancamentos_pontos.bulkAdd(SEED_LANCAMENTOS_PONTOS);
      });
    } else {
      // If alunos already exist but vistorias/advertencias are empty, populate them
      const countVistorias = await this.vistorias.count();
      if (countVistorias === 0) {
        await this.transaction('rw', [
          this.vistorias,
          this.vistoria_itens,
          this.advertencias,
          this.infracoes,
          this.lancamentos_pontos
        ], async () => {
          await this.vistorias.bulkAdd(SEED_VISTORIAS);
          await this.vistoria_itens.bulkAdd(SEED_VISTORIA_ITENS);
          await this.advertencias.bulkAdd(SEED_ADVERTENCIAS);
          await this.infracoes.bulkAdd(SEED_INFRACOES);
          await this.lancamentos_pontos.bulkAdd(SEED_LANCAMENTOS_PONTOS);
        });
      }
    }
  }

  async resetToSeed() {
    await this.transaction('rw', this.tables, async () => {
      for (const table of this.tables) {
        await table.clear();
      }
      await this.perfis.bulkAdd(SEED_PERFIS);
      await this.quartos.bulkAdd(SEED_QUARTOS);
      await this.alunos.bulkAdd(SEED_ALUNOS);
      await this.catalogo.bulkAdd(SEED_CATALOGO);
      await this.meses.add(SEED_MES);
      await this.alocacoes.bulkAdd(SEED_ALOCACOES_SETOR);
      await this.config.put({ chave: 'app_config', valor: SEED_CONFIG });
      await this.vistorias.bulkAdd(SEED_VISTORIAS);
      await this.vistoria_itens.bulkAdd(SEED_VISTORIA_ITENS);
      await this.advertencias.bulkAdd(SEED_ADVERTENCIAS);
      await this.infracoes.bulkAdd(SEED_INFRACOES);
      await this.lancamentos_pontos.bulkAdd(SEED_LANCAMENTOS_PONTOS);
    });
  }
}

export const db = new IcevesDatabase();
db.seedIfEmpty().catch(console.error);
