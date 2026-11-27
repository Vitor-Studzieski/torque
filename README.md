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
npm run lint
npm run build
npm run preview
```

`npm run preview` serve a compilação de produção pelo preview do Vite/Nitro. `npm run start` inicia a saída Node do Nitro.

Para configurar as credenciais locais em um checkout novo, copie `.env.example` para `.env.local` e preencha as variáveis. O arquivo local é ignorado pelo Git.

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
- **Configurações (`/app/configuracoes`)** — dados da oficina, tema e movimento.

## Estrutura

```text
src/
  components/
    layout/       # navegação, busca global, topbar e shell
    torque/       # componentes compartilhados da identidade Torque
    ui/           # primitivos de interface
  data/           # listas de checklist
  features/       # páginas e componentes por módulo
  lib/            # formatação e regras compartilhadas de domínio
  routes/         # rotas baseadas em arquivos do TanStack Router
  stores/         # Zustand para preferências e estado da demonstração
  styles.css      # tokens, tema e estilos globais
  router.jsx
  server.js
  start.js
  routeTree.gen.ts # gerado pelo TanStack Start; não editar manualmente
docs/
  DESIGN_NOTES.md
```

## Dados e demonstração

O aplicativo não cria mais cadastros fictícios. A migração do Zustand remove os registros de exemplo conhecidos que já estavam salvos no navegador e mantém os registros criados manualmente na demonstração. Preferências e dados do modo demonstração permanecem no `localStorage`; em uma conta autenticada com vínculo ativo, os dados operacionais vêm do PostgreSQL.

O projeto Neon e o esquema PostgreSQL estão conectados aos módulos de clientes, veículos, OS, financeiro, estoque e oficina por operações autenticadas no servidor. A conexão local usa a credencial privada em `.env.local`; em produção, Vercel recebe `DATABASE_URL` como variável privada com a URL agrupada do Neon e a role restrita `torque_app_runtime_restricted`. A fundação também inclui autenticação Clerk por convite, associação de membros no PostgreSQL e gestão de convites para responsáveis autenticados, conforme [docs/BACKEND.md](docs/BACKEND.md). A demonstração local não exige autenticação e continua isolada do banco. Envio de orçamento não envia mensagens ao cliente. No modo demonstração, as fotos da OS ficam no IndexedDB local; em contas conectadas, o código envia as fotos ao bucket privado Supabase Storage e emite links temporários após autorização, quando as variáveis privadas do armazenamento estiverem configuradas. O saldo de estoque é atualizado junto com o histórico de movimentações quando uma peça aprovada é aplicada à OS.

## Preparação para Vercel

TanStack Start usa Nitro, e `vercel.json` define o preset do framework e executa as funções em São Paulo (`gru1`), próximo ao Neon. O projeto `torque` já existe na Vercel. `DATABASE_URL` e as variáveis do Supabase Storage estão configuradas somente em Production. Antes do primeiro deploy, conecte este repositório ao projeto e configure o Clerk. As chaves Clerk de produção exigem um domínio próprio controlado; até lá, use chaves de desenvolvimento em previews. Use uma branch Neon isolada para previews e mantenha produção na branch operacional.

## Decisões e suposições

- O checkout já usa TanStack Start e rotas baseadas em arquivos; essa arquitetura foi preservada em vez de trocar o roteador no meio da migração.
- Dados persistidos usam `skipHydration` e reidratação após a montagem no root para manter a resposta SSR determinística.
- Manrope e JetBrains Mono são carregadas de pacotes npm locais para evitar fontes remotas; são as únicas dependências acrescentadas para a direção visual.
- Valores financeiros são demonstrativos e informativos; não representam apuração contábil, cobrança ou pagamento real.
- Novas OS começam sem evidências; fotos podem ser anexadas localmente a cada OS e permanecem no IndexedDB deste navegador.

## Stack

Vite, React, JavaScript ES modules com JSX, TanStack Start/Router com Nitro, Vercel Functions em Node.js, PostgreSQL no Neon, Supabase Storage, Clerk, Tailwind CSS 4, Zustand, Framer Motion, Recharts e lucide-react.
