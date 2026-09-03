# onPreserv

Sistema de gestão de preservação de lotes industriais: cadastro e
acompanhamento de lotes, cronograma de preservação por medição, atividades,
tarefas em quadro kanban e fluxo de aprovação de exclusões.

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 18 + TypeScript + Vite |
| Estilo | Tailwind CSS + Radix UI |
| Gráficos | Recharts |
| Testes | Vitest + Testing Library |
| Banco | PostgreSQL |

## Como rodar

```bash
npm install
npm run dev          # http://localhost:8080
```

Outros comandos:

```bash
npm run build        # build de produção
npm test             # suíte de testes
npm run lint         # análise estática
```

## Banco de dados

O esquema vive em [`server/db/001_schema.sql`](server/db/001_schema.sql), num
arquivo só — 26 tabelas de domínio mais identidade e sessões.

```bash
cd server
cp .env.example .env    # preencha DATABASE_URL
npm install
npm run db:check        # testa a conexão
npm run db:setup        # aplica o esquema
```

O executor usa apenas Node, sem necessidade de `psql` ou Docker.

## Estrutura

```
src/
  components/     componentes de interface
    ui/           primitivos (botão, campo, diálogo…)
    lots/         componentes do módulo de lotes
    tasks/        componentes do módulo de tarefas
    dashboard/    cartões e painéis de indicadores
    users/        gestão de usuários e permissões
  context/        estado global por domínio
  hooks/          hooks reutilizáveis
  lib/            regras puras e utilidades (testáveis sem React)
  pages/          uma por rota
  types/          modelos de domínio e regras de negócio
  docs/           documentação embutida no produto
server/
  db/             esquema e executor de migrations
```

A regra que orienta a divisão: **`lib/` e `types/` não importam React**. É onde
vivem as regras de negócio — ciclo de preservação, filtros, ordenação do
kanban — e é por isso que elas podem ser testadas sem montar componente.

## Convenções

- Regra de negócio em `types/` ou `lib/`, nunca dentro de componente.
- Toda regra de negócio tem teste. Componente, só quando há lógica não trivial.
- Nomes de domínio em português (o vocabulário da operação é português);
  termos técnicos em inglês.
