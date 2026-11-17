# Convenções do Torque

- **Stack:** Vite, React, TypeScript strict, TanStack Start/Router, Tailwind CSS 4, Zustand, Framer Motion, Recharts e lucide-react. Use npm.
- **Comandos:** `npm run dev`, `npm run typecheck`, `npm run lint` e `npm run build`.
- **Escopo:** protótipo exclusivamente front-end; não adicionar backend, autenticação real, chamadas externas, upload ou dados pessoais reais.
- **Idioma:** código, tipos e nomes técnicos em inglês; interface em português brasileiro. Datas em `dd/mm/aaaa` e valores em BRL.
- **Rotas:** mantenha os arquivos de TanStack Router em `src/routes` e telas/lógica em `src/features/<module>`. Preserve URLs existentes. `src/routeTree.gen.ts` é gerado; nunca o edite à mão.
- **Organização:** shell em `src/components/layout`, UI genérica em `src/components/ui`, elementos compartilhados da marca em `src/components/torque`, dados demonstrativos tipados em `src/data`, utilitários em `src/lib` e estado transversal em `src/stores`.
- **Persistência:** Zustand persistido em `localStorage` com `skipHydration`; reidrate no root após a montagem para manter SSR determinístico.
- **Tema:** escuro padrão em `:root`, claro em `.light`; prefira tokens semânticos de `src/styles.css` a cores soltas.
- **Mídia:** use somente ilustrações e placeholders locais, sempre identificados como demonstração. Não inclua dependências externas em tempo de execução.
- **Interação:** não deixe botões sem ação ou telas provisórias. Ações externas devem ser claramente simuladas. Status devem exibir ícone e texto.
- **Acessibilidade:** preserve foco visível, rótulos de formulário e suporte a `prefers-reduced-motion` e à preferência de movimento nas configurações.
