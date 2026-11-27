# Rotas

O TanStack Start usa rotas baseadas em arquivos. Cada arquivo `.jsx` desta pasta
configura uma rota. Mantenha as páginas e regras dos módulos em
`src/features/<module>/pages`; aqui ficam composição, metadados e parâmetros de
rota.

| Arquivo | URL | Responsabilidade |
| --- | --- | --- |
| `__root.jsx` | raiz do app | Documento, estilos globais e hidratação dos stores persistidos |
| `index.jsx` | `/` | Apresentação e entrada da demonstração |
| src/routes/app.jsx | /app | Proteção da sessão, shell da demonstração e outlet |
| `app.index.jsx` | `/app` | Dashboard da oficina |
| `app.clientes.jsx` | `/app/clientes` | Cadastro e histórico de clientes |
| `app.veiculos.jsx` | `/app/veiculos` | Cadastro e histórico de veículos |
| `app.ordens.jsx` | `/app/ordens` | Layout pai das ordens; renderiza `<Outlet />` |
| `app.ordens.index.jsx` | `/app/ordens` | Quadro e lista de ordens de serviço |
| `app.ordens.$id.jsx` | `/app/ordens/:id` | Detalhe e fluxo operacional de uma OS |
| `app.estoque.jsx` | `/app/estoque` | Estoque e peças |
| `app.financeiro.jsx` | `/app/financeiro` | Lançamentos e recebimentos |
| `app.relatorios.jsx` | `/app/relatorios` | Indicadores e gráficos demonstrativos |
| `app.configuracoes.jsx` | `/app/configuracoes` | Preferências locais da demonstração |

`routeTree.gen.ts` é gerado pelo plugin do TanStack Router. Nunca o edite
manualmente; execute `npm run build` para atualizar a árvore após mudanças nas
rotas.

| src/routes/entrar.$.jsx | /entrar/* | Entrada da conta Clerk |
| src/routes/convite.$.jsx | /convite/* | Aceite de convite Clerk; cadastro aberto deve permanecer desativado |
