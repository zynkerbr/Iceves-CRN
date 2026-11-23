/**
 * Configuração Supabase e Migrations SQL Completas
 * Fonte: Seção 4 do Prompt Mestre CRM ICEVES
 */

export const SUPABASE_MIGRATIONS_SQL = `
-- MIGRATION COMPLETA ICEVES CRM (ESCOLA DE CRISTO)
create extension if not exists pgcrypto;
create type papel as enum ('aluno','monitor','preceptor','direcao');
create type grupo as enum ('meninos','meninas');
create type setor_equipe as enum ('cozinha','limpeza_geral');
create type item_vistoria as enum ('cama','guarda_roupa','cestos','chao','banheiro');
create type presenca as enum ('pendente','presente','atrasado','ausente');
create type topico as enum ('quarto','atraso','falta','setor','conduta','outro');
create type origem as enum ('advertencias','vistoria','atraso','falta','direto');

create table if not exists perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  papel papel not null,
  aluno_id uuid
);

create table if not exists quartos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  grupo grupo not null,
  monitor_id uuid references perfis(id),
  fora_do_rodizio boolean default false,
  ordem int default 0
);

create table if not exists alunos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nascimento date,
  grupo grupo not null,
  quarto_id uuid references quartos(id),
  ativo boolean default true,
  em_disciplina boolean default false,
  criado_em timestamptz default now()
);

alter table perfis drop constraint if exists perfis_aluno_fk;
alter table perfis add constraint perfis_aluno_fk foreign key (aluno_id) references alunos(id);

create table if not exists meses (
  id uuid primary key default gen_random_uuid(),
  ano int not null,
  mes int not null,
  grupo grupo not null,
  inicio date,
  fim date,
  unique (ano, mes)
);

create table if not exists alocacoes_setor (
  id uuid primary key default gen_random_uuid(),
  mes_id uuid references meses(id),
  aluno_id uuid references alunos(id),
  setor setor_equipe not null,
  unique (mes_id, aluno_id)
);

create table if not exists escala_dormitorio (
  data date not null,
  quarto_id uuid references quartos(id),
  limpa boolean not null,
  primary key (data, quarto_id)
);

create table if not exists config (
  chave text primary key,
  valor jsonb not null
);

insert into config values
 ('pesos_nota','{"1":6,"2":3,"3":2,"4":0,"5":0}'),
 ('limite_vistoria','6'),
 ('zerar_soma_apos_infracao','true'),
 ('advertencias_por_infracao','3'),
 ('infracoes_para_disciplina','3'),
 ('alerta_na_infracao','2'),
 ('limite_diario_pontos_positivos','5'),
 ('infracao_atraso','1'),
 ('infracao_falta','2'),
 ('equipe_do_mes_no_rodizio','false')
on conflict (chave) do update set valor = excluded.valor;

create table if not exists vistorias (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  quarto_id uuid not null references quartos(id),
  monitor_id uuid references perfis(id),
  criado_em timestamptz default now(),
  unique (data, quarto_id)
);

create table if not exists vistoria_itens (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid references vistorias(id) on delete cascade,
  aluno_id uuid references alunos(id),
  item item_vistoria not null,
  nota smallint not null check (nota between 1 and 5),
  peso_falha smallint not null default 0
);

create table if not exists acumulador_vistoria (
  alvo text check (alvo in ('aluno','quarto')),
  alvo_id uuid,
  soma int not null default 0,
  primary key (alvo, alvo_id)
);

create table if not exists catalogo_motivos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('advertencia','ponto')),
  descricao text not null,
  pontos int not null,
  ativo boolean default true
);

create table if not exists advertencias (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id),
  motivo_id uuid references catalogo_motivos(id),
  monitor_id uuid references perfis(id),
  data date default current_date,
  obs text,
  infracao_id uuid,
  criado_em timestamptz default now()
);

create table if not exists infracoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id),
  topico topico not null,
  origem origem not null,
  descricao text,
  data date default current_date,
  autor_id uuid references perfis(id),
  criado_em timestamptz default now()
);

create table if not exists disciplinas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null unique references alunos(id),
  trabalho_tipo text,
  trabalho_quantidade text,
  prazo date,
  responsavel_id uuid references perfis(id),
  status text not null default 'pendente' check (status in ('pendente','cumprida')),
  criada_em timestamptz default now(),
  cumprida_em timestamptz
);

create table if not exists lancamentos_pontos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id),
  valor int not null check (valor <> 0),
  motivo_id uuid references catalogo_motivos(id),
  motivo text not null,
  autor_id uuid references perfis(id),
  data date default current_date,
  criado_em timestamptz default now(),
  contestacao text,
  contestacao_status text check (contestacao_status in ('aberta','aceita','negada')),
  decidido_por uuid references perfis(id)
);

create table if not exists observacoes_sensiveis (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id),
  texto text not null,
  autor_id uuid references perfis(id),
  criado_em timestamptz default now()
);

create table if not exists periodos_meta (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  inicio date not null,
  fim date not null,
  meta_media numeric(4,2) not null,
  presenca_minima numeric(3,2) default 0.75
);

create table if not exists elegibilidade_passeio (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid references periodos_meta(id),
  aluno_id uuid references alunos(id),
  faixa text check (faixa in ('elegivel','em_risco','nao_elegivel')),
  aprovado boolean default false,
  aprovado_por uuid references perfis(id),
  excecao text,
  unique (periodo_id, aluno_id)
);

create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data timestamptz not null,
  criado_por uuid references perfis(id)
);

create table if not exists checklist_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  filtro jsonb
);

create table if not exists chamada_itens (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  aluno_id uuid references alunos(id),
  status presenca not null default 'pendente',
  chegada timestamptz,
  unique (evento_id, aluno_id)
);

create table if not exists disciplinas_videos (
  id uuid primary key default gen_random_uuid(),
  materia text check (materia in ('civil','social','academica','vocacional')),
  titulo text not null,
  url text not null,
  ordem int default 0
);

create table if not exists videos_assistidos (
  aluno_id uuid references alunos(id),
  video_id uuid references disciplinas_videos(id),
  em timestamptz default now(),
  primary key (aluno_id, video_id)
);

create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  destino_papel papel,
  destino_id uuid,
  mensagem text not null,
  lida boolean default false,
  criada_em timestamptz default now()
);

create table if not exists auditoria (
  id bigint generated always as identity primary key,
  tabela text,
  registro_id text,
  acao text,
  usuario_id uuid,
  antes jsonb,
  depois jsonb,
  em timestamptz default now()
);

create table if not exists acessos_sensiveis (
  id bigint generated always as identity primary key,
  usuario_id uuid,
  aluno_id uuid,
  recurso text,
  em timestamptz default now()
);

-- FUNÇÕES E TRIGGERS
create or replace function cfg(k text) returns jsonb language sql stable as $$ select valor from config where chave = k $$;
create or replace function papel_atual() returns papel language sql stable security definer as $$ select papel from perfis where id = auth.uid() $$;

-- Trigger Advertência
create or replace function trg_advertencia() returns trigger language plpgsql security definer as $$
declare n int; por int := (cfg('advertencias_por_infracao'))::int; inf uuid;
begin
  insert into lancamentos_pontos(aluno_id, valor, motivo_id, motivo, autor_id)
  values (new.aluno_id, -1, new.motivo_id, coalesce(new.obs, 'Advertência'), new.monitor_id);
  select count(*) into n from advertencias where aluno_id = new.aluno_id and infracao_id is null;
  if n >= por then
    insert into infracoes(aluno_id, topico, origem, descricao, autor_id)
    values (new.aluno_id, 'conduta', 'advertencias', por || ' advertências acumuladas', new.monitor_id) returning id into inf;
    update advertencias set infracao_id = inf where id in
      (select id from advertencias where aluno_id = new.aluno_id and infracao_id is null order by criado_em limit por);
  end if;
  return new;
end $$;

drop trigger if exists t_advertencia on advertencias;
create trigger t_advertencia after insert on advertencias for each row execute function trg_advertencia();

-- Trigger Vistoria Item
create or replace function trg_vistoria_item() returns trigger language plpgsql security definer as $$
declare peso int; alvo_t text; alvo_i uuid; nova_soma int; lim int := (cfg('limite_vistoria'))::int; alu uuid;
begin
  peso := (cfg('pesos_nota') ->> new.nota::text)::int;
  update vistoria_itens set peso_falha = peso where id = new.id;
  if peso = 0 then return new; end if;
  alvo_t := case when new.aluno_id is null then 'quarto' else 'aluno' end;
  alvo_i := coalesce(new.aluno_id, (select quarto_id from vistorias where id = new.vistoria_id));
  insert into acumulador_vistoria(alvo, alvo_id, soma) values (alvo_t, alvo_i, peso)
    on conflict (alvo, alvo_id) do update set soma = acumulador_vistoria.soma + peso returning soma into nova_soma;
  if nova_soma >= lim then
    for alu in select id from alunos where ativo and ((alvo_t = 'aluno' and id = alvo_i) or (alvo_t = 'quarto' and quarto_id = alvo_i)) loop
      insert into infracoes(aluno_id, topico, origem, descricao) values (alu, 'quarto', 'vistoria', 'Soma de notas da vistoria chegou a ' || nova_soma);
    end loop;
    update acumulador_vistoria set soma = case when (cfg('zerar_soma_apos_infracao'))::boolean then 0 else soma - lim end
      where alvo = alvo_t and alvo_id = alvo_i;
  end if;
  return new;
end $$;

drop trigger if exists t_vistoria_item on vistoria_itens;
create trigger t_vistoria_item after insert on vistoria_itens for each row execute function trg_vistoria_item();

-- Trigger Infração
create or replace function trg_infracao() returns trigger language plpgsql security definer as $$
declare total int; nome_aluno text;
begin
  select count(*) into total from infracoes where aluno_id = new.aluno_id;
  select nome into nome_aluno from alunos where id = new.aluno_id;
  if total = (cfg('alerta_na_infracao'))::int then
    insert into notificacoes(destino_papel, mensagem) values ('preceptor', nome_aluno || ' chegou à 2ª infração.');
  end if;
  if total >= (cfg('infracoes_para_disciplina'))::int and not exists (select 1 from disciplinas where aluno_id = new.aluno_id) then
    insert into disciplinas(aluno_id) values (new.aluno_id);
    update alunos set em_disciplina = true where id = new.aluno_id;
    insert into notificacoes(destino_papel, mensagem) values
      ('monitor', nome_aluno || ' está de disciplina. Atribua o trabalho e defina o prazo.'),
      ('preceptor', nome_aluno || ' está de disciplina. Atribua o trabalho e defina o prazo.');
  end if;
  return new;
end $$;

drop trigger if exists t_infracao on infracoes;
create trigger t_infracao after insert on infracoes for each row execute function trg_infracao();

-- Trigger Disciplina Cumprida
create or replace function trg_disciplina_cumprida() returns trigger language plpgsql security definer as $$
begin
  if new.status = 'cumprida' and old.status <> 'cumprida' then
    new.cumprida_em := now(); update alunos set em_disciplina = false where id = new.aluno_id;
  end if;
  return new;
end $$;

drop trigger if exists t_disc_cumprida on disciplinas;
create trigger t_disc_cumprida before update on disciplinas for each row execute function trg_disciplina_cumprida();
`;
