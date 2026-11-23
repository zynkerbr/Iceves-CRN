import { db } from './db';
import {
  AppConfig,
  ItemVistoria,
  TopicoInfracao,
  OrigemInfracao,
  VistoriaItem,
  Advertencia,
  Infracao,
  LancamentoPonto,
  Auditoria,
  Notificacao,
  Disciplina
} from '../types';
import { SEED_CONFIG } from '../data/seed';

// Obter configuração atual
export async function getConfig(): Promise<AppConfig> {
  const conf = await db.config.get('app_config');
  return conf ? conf.valor : SEED_CONFIG;
}

// Cálculo do peso de falha a partir da nota
export function calcularPesoFalha(nota: number, config: AppConfig): number {
  const p = config.pesos_nota[nota];
  return typeof p === 'number' ? p : 0;
}

// Média necessária para a meta do passeio
export function mediaNecessaria(
  meta: number,
  totalDias: number,
  pontosFeitos: number,
  diasRestantes: number
): number | null {
  if (diasRestantes <= 0) return null;
  const necessaria = (meta * totalDias - pontosFeitos) / diasRestantes;
  return Math.round(necessaria * 10) / 10;
}

// Trigger de auditoria
export async function registrarAuditoria(
  tabela: string,
  registroId: string,
  acao: string,
  usuarioId: string,
  antes?: any,
  depois?: any
) {
  const item: Auditoria = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    tabela,
    registro_id: registroId,
    acao,
    usuario_id: usuarioId,
    antes,
    depois,
    em: new Date().toISOString(),
  };
  await db.auditoria.add(item);
}

// Regra: Infração
export async function aplicarTrgInfracao(
  alunoId: string,
  topico: TopicoInfracao,
  origem: OrigemInfracao,
  descricao: string,
  autorId?: string
): Promise<Infracao> {
  const config = await getConfig();
  const aluno = await db.alunos.get(alunoId);
  const alunoNome = aluno?.nome || 'Aluno';

  const infracaoId = crypto.randomUUID();
  const novaInfracao: Infracao = {
    id: infracaoId,
    aluno_id: alunoId,
    topico,
    origem,
    descricao,
    data: new Date().toISOString().split('T')[0],
    autor_id: autorId,
    criado_em: new Date().toISOString(),
  };

  await db.infracoes.add(novaInfracao);
  await registrarAuditoria('infracoes', infracaoId, 'INSERT', autorId || 'sistema', null, novaInfracao);

  // Contar total de infrações acumuladas pelo aluno
  const totalInfracoes = await db.infracoes.where('aluno_id').equals(alunoId).count();

  // Alerta antecipado: na 2ª infração notifica o preceptor
  if (totalInfracoes === config.alerta_na_infracao) {
    const notif: Notificacao = {
      id: crypto.randomUUID(),
      destino_papel: 'preceptor',
      mensagem: `${alunoNome} chegou à 2ª infração.`,
      lida: false,
      criada_em: new Date().toISOString(),
    };
    await db.notificacoes.add(notif);
  }

  // 3ª infração (ou mais): abre disciplina uma única vez no curso todo
  if (totalInfracoes >= config.infracoes_para_disciplina) {
    const disciplinaExistente = await db.disciplinas.where('aluno_id').equals(alunoId).first();
    if (!disciplinaExistente) {
      const discId = crypto.randomUUID();
      const novaDisciplina: Disciplina = {
        id: discId,
        aluno_id: alunoId,
        status: 'pendente',
        criada_em: new Date().toISOString(),
        responsavel_id: autorId,
      };
      await db.disciplinas.add(novaDisciplina);
      await db.alunos.update(alunoId, { em_disciplina: true });

      // Notificações para monitor e preceptor
      const msg = `${alunoNome} está de disciplina. Atribua o trabalho e defina o prazo.`;
      await db.notificacoes.bulkAdd([
        {
          id: crypto.randomUUID(),
          destino_papel: 'monitor',
          mensagem: msg,
          lida: false,
          criada_em: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          destino_papel: 'preceptor',
          mensagem: msg,
          lida: false,
          criada_em: new Date().toISOString(),
        },
      ]);
    }
  }

  return novaInfracao;
}

// Regra: Advertência
// Cria advertência, gera -1 ponto e, a cada 3 sem infração, gera 1 infração
export async function aplicarTrgAdvertencia(
  alunoId: string,
  monitorId: string,
  motivoId?: string | null,
  motivoDescricao?: string,
  obs?: string
): Promise<{ advertencia: Advertencia; gerouInfracao: boolean }> {
  const config = await getConfig();
  const advId = crypto.randomUUID();
  const hoje = new Date().toISOString().split('T')[0];

  const novaAdvertencia: Advertencia = {
    id: advId,
    aluno_id: alunoId,
    motivo_id: motivoId,
    motivo_descricao: motivoDescricao || obs || 'Advertência',
    monitor_id: monitorId,
    data: hoje,
    obs,
    criado_em: new Date().toISOString(),
  };

  await db.advertencias.add(novaAdvertencia);
  await registrarAuditoria('advertencias', advId, 'INSERT', monitorId, null, novaAdvertencia);

  // Adiciona lançamento de -1 ponto no score
  const pontoId = crypto.randomUUID();
  const lancamentoPonto: LancamentoPonto = {
    id: pontoId,
    aluno_id: alunoId,
    valor: -1,
    motivo_id: motivoId,
    motivo: obs || motivoDescricao || 'Advertência',
    autor_id: monitorId,
    data: hoje,
    criado_em: new Date().toISOString(),
  };
  await db.lancamentos_pontos.add(lancamentoPonto);
  await registrarAuditoria('lancamentos_pontos', pontoId, 'INSERT', monitorId, null, lancamentoPonto);

  // Verifica advertências não vinculadas a infrações
  const advsSemInfracao = (await db.advertencias
    .where('aluno_id')
    .equals(alunoId)
    .filter((a) => !a.infracao_id)
    .toArray())
    .sort((a, b) => (a.criado_em || '').localeCompare(b.criado_em || ''));

  let gerouInfracao = false;
  if (advsSemInfracao.length >= config.advertencias_por_infracao) {
    const por = config.advertencias_por_infracao;
    const desc = `${por} advertências acumuladas`;
    const inf = await aplicarTrgInfracao(alunoId, 'conduta', 'advertencias', desc, monitorId);
    gerouInfracao = true;

    // Vincula as primeiras `por` advertências a esta infração
    const aVincular = advsSemInfracao.slice(0, por);
    for (const a of aVincular) {
      await db.advertencias.update(a.id, { infracao_id: inf.id });
    }
  }

  return { advertencia: novaAdvertencia, gerouInfracao };
}

// Regra: Vistoria Diária e Acumulador de Falhas
export async function aplicarTrgVistoria(
  quartoId: string,
  monitorId: string,
  itens: {
    aluno_id?: string | null;
    item: ItemVistoria;
    nota: number;
  }[]
): Promise<{ vistoriaId: string; infracoesGeradas: Infracao[] }> {
  const config = await getConfig();
  const vistoriaId = crypto.randomUUID();
  const hoje = new Date().toISOString().split('T')[0];

  const novaVistoria = {
    id: vistoriaId,
    data: hoje,
    quarto_id: quartoId,
    monitor_id: monitorId,
    criado_em: new Date().toISOString(),
  };

  await db.vistorias.put(novaVistoria);
  await registrarAuditoria('vistorias', vistoriaId, 'INSERT', monitorId, null, novaVistoria);

  const infracoesGeradas: Infracao[] = [];

  for (const it of itens) {
    const peso = calcularPesoFalha(it.nota, config);
    const itemId = crypto.randomUUID();
    const vItem: VistoriaItem = {
      id: itemId,
      vistoria_id: vistoriaId,
      aluno_id: it.aluno_id || null,
      item: it.item,
      nota: it.nota,
      peso_falha: peso,
    };
    await db.vistoria_itens.add(vItem);

    if (peso === 0) continue;

    const alvoTipo = it.aluno_id ? 'aluno' : 'quarto';
    const alvoId = it.aluno_id || quartoId;
    const chaveAcumulador = `${alvoTipo}:${alvoId}`;

    const acumExistente = await db.acumuladores.get(chaveAcumulador);
    const somaAnterior = acumExistente?.soma || 0;
    const novaSoma = somaAnterior + peso;

    await db.acumuladores.put({
      alvo: alvoTipo,
      alvo_id: chaveAcumulador,
      soma: novaSoma,
    });

    // Se chegou ou ultrapassou o limite (padrão 6)
    if (novaSoma >= config.limite_vistoria) {
      if (alvoTipo === 'aluno' && it.aluno_id) {
        const inf = await aplicarTrgInfracao(
          it.aluno_id,
          'quarto',
          'vistoria',
          `Soma de notas da vistoria chegou a ${novaSoma}`,
          monitorId
        );
        infracoesGeradas.push(inf);
      } else if (alvoTipo === 'quarto') {
        // Falha no chão ou banheiro do quarto: infração para TODOS os alunos do quarto
        const alunosDoQuarto = await db.alunos
          .where('quarto_id')
          .equals(quartoId)
          .filter((a) => a.ativo)
          .toArray();

        for (const alu of alunosDoQuarto) {
          const inf = await aplicarTrgInfracao(
            alu.id,
            'quarto',
            'vistoria',
            `Soma de notas da vistoria coletiva do dormitório chegou a ${novaSoma}`,
            monitorId
          );
          infracoesGeradas.push(inf);
        }
      }

      // Atualiza acumulador conforme configuração
      const saldoFinal = config.zerar_soma_apos_infracao
        ? 0
        : Math.max(0, novaSoma - config.limite_vistoria);

      await db.acumuladores.put({
        alvo: alvoTipo,
        alvo_id: chaveAcumulador,
        soma: saldoFinal,
      });
    }
  }

  return { vistoriaId, infracoesGeradas };
}

// Obter soma atual do acumulador de vistoria
export async function getAcumuladorVistoria(
  alvoTipo: 'aluno' | 'quarto',
  alvoId: string
): Promise<number> {
  const chave = `${alvoTipo}:${alvoId}`;
  const acum = await db.acumuladores.get(chave);
  return acum?.soma || 0;
}

// Regra: Ajuste de Pontos Manual
export async function aplicarAjustePontos(
  alunoId: string,
  valor: number,
  motivo: string,
  autorId: string,
  motivoId?: string | null
): Promise<LancamentoPonto> {
  if (!motivo || motivo.trim() === '') {
    throw new Error('Informe o motivo do ajuste de pontos.');
  }

  const hoje = new Date().toISOString().split('T')[0];
  const config = await getConfig();

  // Limite diário de pontos positivos por aluno
  if (valor > 0) {
    const pontosHoje = await db.lancamentos_pontos
      .where('aluno_id')
      .equals(alunoId)
      .filter((p) => p.data === hoje && p.valor > 0)
      .toArray();

    const somaHoje = pontosHoje.reduce((acc, curr) => acc + curr.valor, 0);
    if (somaHoje + valor > config.limite_diario_pontos_positivos) {
      throw new Error(
        `Limite diário de pontos positivos atingido (${config.limite_diario_pontos_positivos} pts/dia). Hoje já foram concedidos ${somaHoje} pts.`
      );
    }
  }

  const pontoId = crypto.randomUUID();
  const novoPonto: LancamentoPonto = {
    id: pontoId,
    aluno_id: alunoId,
    valor,
    motivo_id: motivoId || null,
    motivo: motivo.trim(),
    autor_id: autorId,
    data: hoje,
    criado_em: new Date().toISOString(),
  };

  await db.lancamentos_pontos.add(novoPonto);
  await registrarAuditoria('lancamentos_pontos', pontoId, 'INSERT', autorId, null, novoPonto);

  return novoPonto;
}

// Contestar Lançamento de Ponto (Aluno)
export async function contestarLancamento(
  pontoId: string,
  alunoId: string,
  justificativa: string
) {
  const ponto = await db.lancamentos_pontos.get(pontoId);
  if (!ponto) throw new Error('Lançamento não encontrado.');
  if (ponto.aluno_id !== alunoId) throw new Error('Não autorizado a contestar este lançamento.');

  await db.lancamentos_pontos.update(pontoId, {
    contestacao: justificativa,
    contestacao_status: 'aberta',
  });

  await registrarAuditoria('lancamentos_pontos', pontoId, 'CONTESTACAO', alunoId, ponto, {
    ...ponto,
    contestacao: justificativa,
    contestacao_status: 'aberta',
  });
}

// Decidir Contestação (Preceptor ou Direção)
export async function decidirContestacao(
  pontoId: string,
  preceptorId: string,
  status: 'aceita' | 'negada'
) {
  const ponto = await db.lancamentos_pontos.get(pontoId);
  if (!ponto) throw new Error('Lançamento não encontrado.');

  await db.lancamentos_pontos.update(pontoId, {
    contestacao_status: status,
    decidido_por: preceptorId,
  });

  // Se aceita, neutraliza o ponto negativo com um estorno
  if (status === 'aceita' && ponto.valor < 0) {
    const estornoId = crypto.randomUUID();
    const estorno: LancamentoPonto = {
      id: estornoId,
      aluno_id: ponto.aluno_id,
      valor: Math.abs(ponto.valor),
      motivo: `Contestação aceita: estorno de "${ponto.motivo}"`,
      autor_id: preceptorId,
      data: new Date().toISOString().split('T')[0],
      criado_em: new Date().toISOString(),
    };
    await db.lancamentos_pontos.add(estorno);
  }

  await registrarAuditoria('lancamentos_pontos', pontoId, 'DECISAO_CONTESTACAO', preceptorId, ponto, {
    ...ponto,
    contestacao_status: status,
    decidido_por: preceptorId,
  });
}

// Marcar Disciplina como Cumprida
export async function marcarDisciplinaCumprida(disciplinaId: string, autorId: string) {
  const disc = await db.disciplinas.get(disciplinaId);
  if (!disc) throw new Error('Disciplina não encontrada.');

  const agora = new Date().toISOString();
  await db.disciplinas.update(disciplinaId, {
    status: 'cumprida',
    cumprida_em: agora,
  });

  await db.alunos.update(disc.aluno_id, { em_disciplina: false });

  await registrarAuditoria('disciplinas', disciplinaId, 'UPDATE', autorId, disc, {
    ...disc,
    status: 'cumprida',
    cumprida_em: agora,
  });
}

// Calcular score total de um aluno
export async function getScoreAluno(alunoId: string): Promise<number> {
  const pontos = await db.lancamentos_pontos.where('aluno_id').equals(alunoId).toArray();
  return pontos.reduce((acc, curr) => acc + curr.valor, 0);
}
