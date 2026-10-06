# Mendes' House

App da casa da Madu e do Gabriel: finanças, agenda compartilhada, tarefas
domésticas, despensa/lista de compras e valores familiares.

Next.js 16 + Supabase (Postgres) + Netlify — mesmo padrão dos apps da Zōsa.

## Módulos

- **Início** — resumo do dia: agenda de hoje, tarefas, contas vencendo, o que está acabando.
- **Agenda** — semana / mês / lista. Cada compromisso é da Madu, do Gabriel ou
  compartilhado, com cor editável e **valor obrigatório**. Repetições
  (diária, semanal, quinzenal, mensal) e exclusão de uma única ocorrência.
  Indicadores "compromissos na semana" de cada um.
- **Finanças** — visão geral (receitas, despesas, saldo, fixo × variável,
  maiores gastos, vale, 6 meses, orçamento de tempo), lançamentos (com
  parcelamento e "pago por quem"), contas fixas que viram lançamentos todo
  mês, destinação (limite por categoria + aportes), caixinhas de reserva e
  importação de extrato em PDF.
- **Casa** — tarefas com frequência (diária, semanal, quinzenal, mensal,
  revezamento semanal) que aparecem na agenda; despensa com mínimo por item;
  lista de compras que atualiza a despensa ao finalizar.
- **Valores** — missão, lema, valores (familiares / da Madu / do Gabriel),
  prioridades ordenadas e indicadores de tempo por valor e tempo livre.

## Acesso

Sem senha: cada um entra só tocando no seu nome (Madu ou Gabriel). O site
fica fora dos buscadores (robots noindex). O cookie é assinado com
`APP_SESSION_SECRET`. Tudo o que é criado guarda quem criou/alterou.

## Configuração

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor (uma vez).
2. Copie `.env.example` para `.env.local` e preencha.
3. `npm install` e `npm run dev`.

A leitura de extrato funciona sem chave (extratos em texto no formato
`dd/mm descrição valor`). Com `ANTHROPIC_API_KEY`, usa IA e entende qualquer
banco/fatura (custo por uso na conta da Anthropic).
