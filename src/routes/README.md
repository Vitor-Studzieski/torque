# Rotas

O TanStack Start usa rotas baseadas em arquivos. Cada arquivo `.tsx` desta pasta
configura uma rota. Mantenha as páginas e regras dos módulos em
`src/features/<module>/pages`; aqui ficam composição, metadados e parâmetros de
rota.

| Arquivo | URL | Responsabilidade |
| --- | --- | --- |
| `__root.tsx` | raiz do app | Documento, estilos globais e hidratação dos stores persistidos |
| `index.tsx` | `/` | Apresentação e entrada da demonstração |
| `app.tsx` | `/app` | Shell autenticado de demonstração, navegação e `<Outlet />` |
| `app.index.tsx` | `/app` | Dashboard da oficina |
| `app.clientes.tsx` | `/app/clientes` | Cadastro e histórico de clientes |
| `app.veiculos.tsx` | `/app/veiculos` | Cadastro e histórico de veículos |
| `app.ordens.tsx` | `/app/ordens` | Layout pai das ordens; renderiza `<Outlet />` |
| `app.ordens.index.tsx` | `/app/ordens` | Quadro e lista de ordens de serviço |
| `app.ordens.$id.tsx` | `/app/ordens/:id` | Detalhe e fluxo operacional de uma OS |
| `app.estoque.tsx` | `/app/estoque` | Estoque e peças |
| `app.financeiro.tsx` | `/app/financeiro` | Lançamentos e recebimentos |
| `app.relatorios.tsx` | `/app/relatorios` | Indicadores e gráficos demonstrativos |
| `app.configuracoes.tsx` | `/app/configuracoes` | Preferências locais da demonstração |

`routeTree.gen.ts` é gerado pelo plugin do TanStack Router. Nunca o edite
manualmente; execute `npm run build` para atualizar a árvore após mudanças nas
rotas.
