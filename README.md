# Torque

Protótipo navegável de uma plataforma de gestão para oficinas mecânicas. A ordem de serviço conecta o recebimento do veículo, inspeção, orçamento, aprovação, execução, evidências, entrega e lançamentos financeiros.

## Como executar

Requer Node.js compatível com Vite 8 e npm.

```bash
npm install
npm run dev
```

O Vite informa a URL local ao iniciar. Comandos adicionais:

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Telas

- **Entrada da demonstração (`/`)** — proposta de valor, seleção de perfil demonstrativo e acesso ao produto.
- **Visão geral (`/app`)** — indicadores, funil de OS, pendências e atividade recente.
- **Ordens de serviço (`/app/ordens`)** — kanban ou lista, pesquisa, filtros, criação e mudança de etapa por arrastar.
- **Detalhe da OS (`/app/ordens/:id`)** — dados de entrada, diagnóstico, tarefas, peças, aprovação, checklists, fotos, comparador e linha do tempo.
- **Clientes (`/app/clientes`)** — busca, criação/edição, classificação e veículos/histórico relacionados.
- **Veículos (`/app/veiculos`)** — busca, criação/edição e histórico de manutenção relacionado.
- **Financeiro (`/app/financeiro`)** — entradas/saídas, vencimentos, filtros, baixa e lançamentos.
- **Estoque e peças (`/app/estoque`)** — catálogo, custo/preço, alerta de mínimo e movimentação demonstrativa.
- **Relatórios (`/app/relatorios`)** — OS por etapa, movimento financeiro, serviços e produtividade com período selecionável.
- **Configurações (`/app/configuracoes`)** — dados da oficina, tema, movimento e restauração da demonstração.

## Estrutura

```text
src/
  components/
    layout/       # navegação, busca global, topbar e shell
    torque/       # componentes compartilhados da identidade Torque
    ui/           # primitivos de interface
  data/           # dados fictícios tipados e fábrica do conjunto inicial
  features/       # páginas e componentes por módulo
  lib/            # formatação e regras compartilhadas de domínio
  routes/         # rotas baseadas em arquivos do TanStack Router
  stores/         # Zustand persistido para preferências e dados da oficina
  styles.css      # tokens, tema e estilos globais
  router.tsx
  server.ts
  start.ts
  routeTree.gen.ts # gerado pelo TanStack Router
docs/
  DESIGN_NOTES.md
```

## Dados e demonstração

O conjunto inicial é criado em `src/data/demo-data.ts` e inclui clientes, veículos, ordens, peças, lançamentos e mecânicos com relações compartilhadas entre as telas. Alterações ficam no `localStorage` deste navegador por meio do Zustand. Em **Configurações → Restaurar dados de demonstração**, confirme a restauração para repor o conjunto inicial.

O produto não usa backend, autenticação real, serviços externos ou upload real. Ações como envio de orçamento são identificadas como simulação. Fotos são ilustrações locais em gradientes e SVG, com rótulo de conteúdo demonstrativo. O saldo de estoque só baixa quando uma peça é marcada como aplicada na OS.

## Decisões e suposições

- O checkout já usa TanStack Start e rotas baseadas em arquivos; essa arquitetura foi preservada em vez de trocar o roteador no meio da migração.
- Dados persistidos usam `skipHydration` e reidratação após a montagem no root para manter a resposta SSR determinística.
- Manrope e JetBrains Mono são carregadas de pacotes npm locais para evitar fontes remotas; são as únicas dependências acrescentadas para a direção visual.
- Valores financeiros são demonstrativos e informativos; não representam apuração contábil, cobrança ou pagamento real.
- Evidências fotográficas são placeholders gerados localmente; anexar arquivos reais fica fora do protótipo.

## Stack

Vite, React, TypeScript strict, TanStack Start/Router, Tailwind CSS 4, Zustand, Framer Motion, Recharts e lucide-react.
