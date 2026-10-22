-- Mendes' House: dias da semana nos compromissos, limites em % e carteira do vale.
-- Só ADICIONA colunas (nada é apagado). Pode rodar mais de uma vez sem problema.

-- compromissos que repetem em dias específicos (0=domingo … 6=sábado)
alter table eventos add column if not exists dias_semana int[] not null default '{}';

-- limite da categoria como % da renda (salários e rendas, sem vale)
alter table categorias add column if not exists orcamento_pct numeric(5,2);

-- qual vale (categoria de receita) pagou/recebeu este lançamento
alter table lancamentos add column if not exists vale_categoria_id uuid references categorias(id) on delete set null;
