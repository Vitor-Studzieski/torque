# Convenções do Torque

- **Stack:** JavaScript (módulos ES com JSX), Vite, React, TanStack Start/Router, Nitro em Vercel Functions, PostgreSQL no Neon, Supabase Storage S3-compatível para fotos privadas, Clerk para autenticação. Node.js é usado no runtime do servidor, ferramentas locais e scripts. Use npm.
- **Comandos:** `npm run dev`, `npm run lint`, `npm run build` e `npm test`.
- **Escopo:** SaaS de gestão para oficinas, com interface e backend implementados por etapas. Não incluir serviços ou funcionalidades fora das decisões registradas em docs/BACKEND.md. Dados demonstrativos permanecem no desenvolvimento; produção começa limpa.
- **Linguagem:** use `.js` e `.jsx` nos arquivos da aplicação. A exceção é `src/routeTree.gen.ts`, gerado pelo TanStack Start; não o edite manualmente.
- **Idioma:** código e nomes técnicos em inglês; interface em português brasileiro. Datas em `dd/mm/aaaa` e valores em BRL.
- **Rotas:** mantenha os arquivos de TanStack Router em `src/routes` e telas/lógica em `src/features/<module>`. Preserve URLs existentes. `src/routeTree.gen.ts` é gerado; nunca o edite à mão.
- **Organização:** shell em `src/components/layout`, UI genérica em `src/components/ui`, elementos compartilhados da marca em `src/components/torque`, dados demonstrativos em `src/data`, utilitários em `src/lib` e estado transversal em `src/stores`.
- **Persistência:** dados de produção pertencem ao PostgreSQL por oficina, com isolamento RLS e autorização no servidor. Fotos de produção ficam em bucket privado do Supabase Storage; o PostgreSQL guarda metadados. Zustand/localStorage e IndexedDB permanecem somente nos fluxos demonstrativos até cada módulo ser conectado.
- **Tema:** escuro padrão em `:root`, claro em `.light`; prefira tokens semânticos de `src/styles.css` a cores soltas.
- **Mídia:** placeholders devem ser identificados como demonstração. Fotos de produção devem ser armazenadas no bucket privado Supabase e só acessadas após autorização no servidor. Nunca exponha chaves, URLs privadas ou segredos no cliente.
- **Interação:** não deixe botões sem ação ou telas provisórias. Ações externas devem ser claramente simuladas. Status devem exibir ícone e texto.
- **Acessibilidade:** preserve foco visível, rótulos de formulário e suporte a `prefers-reduced-motion` e à preferência de movimento nas configurações.
