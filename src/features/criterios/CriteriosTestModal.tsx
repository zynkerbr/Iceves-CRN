import React, { useState } from 'react';
import { db } from '../../lib/db';
import {
  aplicarTrgAdvertencia,
  aplicarTrgVistoria,
  mediaNecessaria,
  getConfig,
  getScoreAluno
} from '../../lib/regras';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, CheckCircle2, Play, RefreshCw, X, AlertCircle } from 'lucide-react';

interface TestResult {
  nome: string;
  esperado: string;
  obtido: string;
  passou: boolean;
  detalhe?: string;
}

export function CriteriosTestModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  if (!isOpen) return null;

  const runAllTests = async () => {
    setRunning(true);
    const res: TestResult[] = [];

    try {
      // Teste 1: Fórmula da Média Necessária
      // Meta 4.0, 30 dias, 36 pontos em 10 dias passados (20 dias restantes) -> 4.2
      const calcMedia = mediaNecessaria(4.0, 30, 36, 20);
      res.push({
        nome: 'Fórmula da Média Necessária (Meta do Passeio)',
        esperado: '4.2',
        obtido: `${calcMedia}`,
        passou: calcMedia === 4.2,
        detalhe: '(4.0 × 30 − 36) ÷ 20 = 84 ÷ 20 = 4.2 pontos por dia',
      });

      // Teste 2: 3 advertências geram 1 infração e somam -3 no score
      const testAlunoId = 'aluno-test-adv-' + Date.now();
      await db.alunos.add({
        id: testAlunoId,
        nome: 'Aluno Teste Advertência',
        grupo: 'meninos',
        ativo: true,
        em_disciplina: false,
        criado_em: new Date().toISOString(),
      });

      // Lançar 3 advertências
      await aplicarTrgAdvertencia(testAlunoId, 'perfil-monitor-1', null, 'Falta leve 1');
      await aplicarTrgAdvertencia(testAlunoId, 'perfil-monitor-1', null, 'Falta leve 2');
      const adv3 = await aplicarTrgAdvertencia(testAlunoId, 'perfil-monitor-1', null, 'Falta leve 3');

      const scoreFinal = await getScoreAluno(testAlunoId);
      const infracoesAdv = await db.infracoes.where('aluno_id').equals(testAlunoId).toArray();

      res.push({
        nome: '3 Advertências -> 1 Infração e -3 no Score',
        esperado: '1 infração e score de -3 pontos',
        obtido: `${infracoesAdv.length} infração(ões) e score ${scoreFinal} pts`,
        passou: adv3.gerouInfracao && infracoesAdv.length === 1 && scoreFinal === -3,
        detalhe: 'Cada advertência gerou -1 ponto; a 3ª acumulada acionou o trigger de infração de conduta.',
      });

      // Teste 3: 1 nota 1 na vistoria gera 1 infração (peso 6 >= limite 6)
      const testAlunoNota1 = 'aluno-test-n1-' + Date.now();
      await db.alunos.add({
        id: testAlunoNota1,
        nome: 'Aluno Teste Nota 1',
        grupo: 'meninos',
        ativo: true,
        em_disciplina: false,
        criado_em: new Date().toISOString(),
      });

      const resVist1 = await aplicarTrgVistoria('quarto-101', 'perfil-monitor-1', [
        { aluno_id: testAlunoNota1, item: 'cama', nota: 1 },
      ]);

      res.push({
        nome: '1 Nota 1 na Vistoria gera 1 Infração (Peso 6)',
        esperado: '1 infração gerada imediatamente',
        obtido: `${resVist1.infracoesGeradas.length} infração(ões) gerada(s)`,
        passou: resVist1.infracoesGeradas.length === 1,
        detalhe: 'Nota 1 possui peso de falha 6. Atingiu o limite de vistoria 6 e acionou infração.',
      });

      // Teste 4: 2 notas 2 geram 1 infração (peso 3 + 3 = 6)
      const testAlunoNota2 = 'aluno-test-n2-' + Date.now();
      await db.alunos.add({
        id: testAlunoNota2,
        nome: 'Aluno Teste Nota 2',
        grupo: 'meninos',
        ativo: true,
        em_disciplina: false,
        criado_em: new Date().toISOString(),
      });

      const resVist2 = await aplicarTrgVistoria('quarto-101', 'perfil-monitor-1', [
        { aluno_id: testAlunoNota2, item: 'cama', nota: 2 },
        { aluno_id: testAlunoNota2, item: 'guarda_roupa', nota: 2 },
      ]);

      res.push({
        nome: '2 Notas 2 na Vistoria geram 1 Infração (3 + 3 = 6)',
        esperado: '1 infração gerada',
        obtido: `${resVist2.infracoesGeradas.length} infração(ões)`,
        passou: resVist2.infracoesGeradas.length === 1,
        detalhe: 'Cada nota 2 adiciona 3 pontos de falha. 3 + 3 = 6, gerando 1 infração de quarto.',
      });

      // Teste 5: 3 notas 3 geram 1 infração (2 + 2 + 2 = 6)
      const testAlunoNota3 = 'aluno-test-n3-' + Date.now();
      await db.alunos.add({
        id: testAlunoNota3,
        nome: 'Aluno Teste Nota 3',
        grupo: 'meninos',
        ativo: true,
        em_disciplina: false,
        criado_em: new Date().toISOString(),
      });

      // 1ª vistoria: 2 notas 3 (peso 2 + 2 = 4 falhas acumuladas)
      await aplicarTrgVistoria('quarto-101', 'perfil-monitor-1', [
        { aluno_id: testAlunoNota3, item: 'cama', nota: 3 },
        { aluno_id: testAlunoNota3, item: 'guarda_roupa', nota: 3 },
      ]);

      // 2ª vistoria: mais 1 nota 3 (4 + 2 = 6, atingindo o limite de 6 falhas e acionando infração)
      const resVist3 = await aplicarTrgVistoria('quarto-101', 'perfil-monitor-1', [
        { aluno_id: testAlunoNota3, item: 'cama', nota: 3 },
      ]);

      res.push({
        nome: '3 Notas 3 na Vistoria geram 1 Infração (2 + 2 + 2 = 6)',
        esperado: '1 infração gerada',
        obtido: `${resVist3.infracoesGeradas.length} infração(ões)`,
        passou: resVist3.infracoesGeradas.length === 1,
        detalhe: 'Cada nota 3 adiciona 2 pontos de falha. O acumulador somou 2 + 2 + 2 = 6, gerando 1 infração de quarto.',
      });

      // Teste 6: 1 nota 2 + 2 notas 3 geram 1 infração (3 + 2 + 2 = 7 >= 6)
      const testAlunoMisto = 'aluno-test-misto-' + Date.now();
      await db.alunos.add({
        id: testAlunoMisto,
        nome: 'Aluno Teste Misto',
        grupo: 'meninos',
        ativo: true,
        em_disciplina: false,
        criado_em: new Date().toISOString(),
      });

      const resVistMisto = await aplicarTrgVistoria('quarto-101', 'perfil-monitor-1', [
        { aluno_id: testAlunoMisto, item: 'cama', nota: 2 }, // peso 3
        { aluno_id: testAlunoMisto, item: 'guarda_roupa', nota: 3 }, // peso 2
        { aluno_id: testAlunoMisto, item: 'cestos', nota: 3 }, // peso 2 -> total 7
      ]);

      res.push({
        nome: '1 Nota 2 + 2 Notas 3 geram 1 Infração (3 + 2 + 2 = 7 >= 6)',
        esperado: '1 infração gerada',
        obtido: `${resVistMisto.infracoesGeradas.length} infração(ões)`,
        passou: resVistMisto.infracoesGeradas.length === 1,
        detalhe: 'Soma de falhas chegou a 7, superando o limite 6 e acionando infração automática.',
      });

      // Teste 7: 2ª Infração notifica Preceptor; 3ª Infração coloca "De Disciplina"
      const testAlunoDisc = 'aluno-test-disc-' + Date.now();
      await db.alunos.add({
        id: testAlunoDisc,
        nome: 'Aluno Teste Disciplina',
        grupo: 'meninos',
        ativo: true,
        em_disciplina: false,
        criado_em: new Date().toISOString(),
      });

      // Gera 1ª, 2ª e 3ª infração diretamente via vistoria
      await aplicarTrgVistoria('quarto-101', 'perfil-monitor-1', [
        { aluno_id: testAlunoDisc, item: 'cama', nota: 1 },
      ]);
      await aplicarTrgVistoria('quarto-101', 'perfil-monitor-1', [
        { aluno_id: testAlunoDisc, item: 'cama', nota: 1 },
      ]);
      await aplicarTrgVistoria('quarto-101', 'perfil-monitor-1', [
        { aluno_id: testAlunoDisc, item: 'cama', nota: 1 },
      ]);

      const alunoAtualizado = await db.alunos.get(testAlunoDisc);
      const discRegistrada = await db.disciplinas.where('aluno_id').equals(testAlunoDisc).first();
      const notifsPreceptor = await db.notificacoes.where('destino_papel').equals('preceptor').toArray();
      const temNotif2 = notifsPreceptor.some((n) => n.mensagem.includes('chegou à 2ª infração'));

      res.push({
        nome: '2ª Notifica Preceptor & 3ª Infração Coloca de Disciplina',
        esperado: 'Notificação na 2ª e em_disciplina=true na 3ª',
        obtido: `Notificação enviada? ${temNotif2 ? 'Sim' : 'Não'}. Em disciplina? ${alunoAtualizado?.em_disciplina ? 'Sim' : 'Não'}`,
        passou: temNotif2 && alunoAtualizado?.em_disciplina === true && !!discRegistrada,
        detalhe: 'O aluno atingiu 3 infrações no curso e foi automaticamente colocado de disciplina com registro aberto.',
      });
    } catch (e: any) {
      res.push({
        nome: 'Execução de Testes',
        esperado: 'Executar sem exceções',
        obtido: `Erro: ${e.message}`,
        passou: false,
      });
    } finally {
      setResults(res);
      setRunning(false);
    }
  };

  const totalPassou = results.filter((r) => r.passou).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--line)] my-8">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--pri-soft)] flex items-center justify-center text-[var(--pri-text)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--ink)]">
                Verificação dos Critérios de Aceite (Etapa 1 — MVP)
              </h3>
              <p className="text-xs text-[var(--ink2)]">
                Bateria automatizada das regras de negócio, pesos de falha e triggers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ink2)] hover:text-[var(--ink)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-[var(--surface2)]">
          <div className="text-xs">
            <span className="font-bold text-[var(--ink)] block">Validação Automática das Regras:</span>
            <span className="text-[var(--ink2)]">
              Testa notas 1, 2 e 3 na vistoria, advertências x3, disciplina e fórmula da meta.
            </span>
          </div>
          <button
            onClick={runAllTests}
            disabled={running}
            className="btn sm font-bold cursor-pointer shrink-0"
          >
            {running ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Testando...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1" /> Executar Testes
              </>
            )}
          </button>
        </div>

        {results.length > 0 ? (
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <span className="text-xs font-bold text-[var(--ink)]">
                Resultado: {totalPassou} de {results.length} critérios aprovados
              </span>
              <Badge variant={totalPassou === results.length ? 'ok' : 'warn'}>
                {totalPassou === results.length ? '100% em conformidade' : 'Ajustes pendentes'}
              </Badge>
            </div>

            {results.map((r, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${
                  r.passou
                    ? 'bg-[var(--ok-soft)] border-[var(--ok)]/30 text-[var(--ink)]'
                    : 'bg-[var(--bad-soft)] border-[var(--bad)]/30 text-[var(--bad)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    {r.passou ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[var(--bad)]" />
                    )}
                    <span>{r.nome}</span>
                  </div>
                  <span className={`font-extrabold ${r.passou ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}`}>
                    {r.passou ? 'APROVADO' : 'FALHOU'}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--ink2)] pl-5">
                  Esperado: <strong>{r.esperado}</strong> · Obtido: <strong>{r.obtido}</strong>
                </div>
                {r.detalhe && (
                  <p className="text-[11px] text-[var(--ink2)] pl-5 italic mt-0.5">
                    {r.detalhe}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-[var(--ink2)]">
            Clique em <strong>Executar Testes</strong> para verificar todos os critérios de aceite da Seção 10.
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-[var(--line)] mt-4">
          <button onClick={onClose} className="btn ghost sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
