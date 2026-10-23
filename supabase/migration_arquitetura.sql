-- Arquitetura de contas: grandes contas → classes → subclasses (árvore de categorias de despesa)

-- ===== PASSO 1: estrutura =====
alter table categorias add column if not exists parent_id uuid references categorias(id) on delete cascade;
alter table categorias add column if not exists grande_conta boolean not null default false;
create index if not exists categorias_parent_idx on categorias (parent_id);

-- ===== PASSO 2: monta a arquitetura (reaproveita as categorias que já existem, com seus % e lançamentos) =====
create or replace function pg_temp.conta(nomes text[], novo text, pai uuid, ord int, nat text, emo text, cor_ text, chaves text default '')
returns uuid language plpgsql as $f$
declare x uuid;
begin
  select id into x from categorias
   where tipo = 'despesa' and nome = any(nomes) and parent_id is null and not grande_conta
   order by array_position(nomes, nome) limit 1;
  if x is null then
    insert into categorias (nome, tipo, natureza, emoji, cor, palavras_chave) values (novo, 'despesa', nat, emo, cor_, chaves) returning id into x;
  end if;
  update categorias set nome = novo, parent_id = pai, grande_conta = (pai is null), ordem = ord where id = x;
  return x;
end $f$;

do $$
declare
  desp uuid; fut uuid; pres uuid; gen uuid;
  transp uuid; mor uuid; contas uuid; alim uuid; reserva uuid; ours uuid;
begin
  if exists (select 1 from categorias where grande_conta) then
    raise notice 'A arquitetura já existe, nada a fazer.';
    return;
  end if;

  -- grandes contas
  desp := pg_temp.conta('{Despesas}', 'Despesas', null, 1, 'fixo', '🧾', '#d9622b');
  fut  := pg_temp.conta('{Futuro}', 'Futuro', null, 2, 'fixo', '🌱', '#2a9d8f');
  pres := pg_temp.conta('{Presente}', 'Presente', null, 3, 'variavel', '🎁', '#e9a23b');
  gen  := pg_temp.conta('{Generosidade}', 'Generosidade', null, 4, 'fixo', '🤲', '#8b55c9');

  -- Despesas › 1. Transporte
  transp := pg_temp.conta('{Transporte}', 'Transporte', desp, 1, 'variavel', '🚗', '#ef4444');
  perform pg_temp.conta('{Financiamento do carro}', 'Financiamento do carro', transp, 1, 'fixo', '🚙', '#ef4444', 'financiamento veiculo,financiamento do carro');
  perform pg_temp.conta('{Gasolina / Uber,Combustível}', 'Combustível', transp, 2, 'variavel', '⛽', '#ef4444', 'posto,combustivel,combustível,shell,ipiranga');
  perform pg_temp.conta('{Uber}', 'Uber', transp, 3, 'variavel', '🚕', '#ef4444', 'uber,99app,99 pop');
  perform pg_temp.conta('{Manutenções}', 'Manutenções', transp, 4, 'variavel', '🔧', '#ef4444', 'oficina,mecanica,mecânica,pneu,revisao,revisão');

  -- Despesas › 2. Moradia
  mor := pg_temp.conta('{Moradia}', 'Moradia', desp, 2, 'fixo', '🏠', '#6366f1');
  perform pg_temp.conta('{Financiamento da casa}', 'Financiamento da casa', mor, 1, 'fixo', '🏡', '#6366f1', 'financiamento habitacional,habitacao,habitação');
  perform pg_temp.conta('{Seguro,Seguros}', 'Seguro', mor, 2, 'fixo', '🛡️', '#6366f1', 'seguro residencial');
  perform pg_temp.conta('{IPTU}', 'IPTU', mor, 3, 'fixo', '🏛️', '#6366f1', 'iptu');
  contas := pg_temp.conta('{Contas da casa}', 'Contas da casa', mor, 4, 'fixo', '💡', '#f59e0b');
  perform pg_temp.conta('{Internet}', 'Internet', contas, 1, 'fixo', '📶', '#f59e0b', 'internet,vivo,claro,tim,oi fibra');
  perform pg_temp.conta('{Energia}', 'Energia', contas, 2, 'fixo', '⚡', '#f59e0b', 'energia,luz,celesc,copel,cemig,enel');
  perform pg_temp.conta('{Água}', 'Água', contas, 3, 'fixo', '💧', '#f59e0b', 'agua,água,casan,sabesp,samae');
  perform pg_temp.conta('{Benfeitorias,Casa e manutenção}', 'Benfeitorias', mor, 5, 'variavel', '🔨', '#a16207', 'leroy,cassol,ferragem,material de construcao');

  -- Despesas › 3. Alimentação
  alim := pg_temp.conta('{Alimentação}', 'Alimentação', desp, 3, 'variavel', '🍽️', '#22c55e');
  perform pg_temp.conta('{Mercado}', 'Mercado', alim, 1, 'variavel', '🛒', '#22c55e');
  perform pg_temp.conta('{Alimentação fora}', 'Alimentação fora', alim, 2, 'variavel', '🍔', '#f97316');

  -- Despesas › 4. Assinaturas
  perform pg_temp.conta('{Assinaturas}', 'Assinaturas', desp, 4, 'fixo', '📺', '#ec4899');

  -- Futuro
  reserva := pg_temp.conta('{Reserva de emergência}', 'Reserva de emergência', fut, 1, 'fixo', '🛟', '#0ea5e9');
  perform pg_temp.conta('{Saúde}', 'Saúde', reserva, 1, 'fixo', '🩺', '#0ea5e9');
  perform pg_temp.conta('{Reserva salarial}', 'Reserva salarial', reserva, 2, 'fixo', '💼', '#0ea5e9');
  perform pg_temp.conta('{Viagem}', 'Viagem', fut, 2, 'variavel', '✈️', '#f97316');
  perform pg_temp.conta('{Investimento}', 'Investimento', fut, 3, 'fixo', '📈', '#16a34a');

  -- Presente
  ours := pg_temp.conta('{Ourselves}', 'Ourselves', pres, 1, 'variavel', '💛', '#e9a23b');
  perform pg_temp.conta('{Madu herself,Madu}', 'Madu', ours, 1, 'variavel', '🌷', '#e8508a');
  perform pg_temp.conta('{Gabriel himself,Gabriel}', 'Gabriel', ours, 2, 'variavel', '🧢', '#2f86c8');
  perform pg_temp.conta('{Comunhão}', 'Comunhão', pres, 2, 'variavel', '🤝', '#e9a23b');
  perform pg_temp.conta('{Dates}', 'Dates', pres, 3, 'variavel', '💑', '#e9a23b');

  -- Generosidade › Dízimo
  perform pg_temp.conta('{Dízimo e ofertas,Dízimo}', 'Dízimo', gen, 1, 'fixo', '🙏', '#8b5cf6', 'dizimo,dízimo,oferta,igreja');

  -- contas novas começam com a soma do % que já estava nas de dentro
  update categorias c set orcamento_pct = (select nullif(sum(f.orcamento_pct), 0) from categorias f where f.parent_id = c.id)
   where c.id in (alim, ours) and c.orcamento_pct is null;
  update categorias c set orcamento_pct = (select nullif(sum(f.orcamento_pct), 0) from categorias f where f.parent_id = c.id)
   where c.id in (desp, fut, pres, gen) and c.orcamento_pct is null;
end $$;
