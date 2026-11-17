# Design notes — Torque

**Pesquisa consultada:** 17/11/2026.
**Princípio:** usar referências para entender hierarquia e interação; não reproduzir telas, marcas, textos ou ilustrações.

## Referências e aprendizados

| Referência                                                                                                                                      | O que foi observado                                                                                                      | Aplicação no Torque                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [Linear — Board layout](https://linear.app/docs/board-layout) e [Display options](https://linear.app/docs/display-options)                      | Alternar entre quadro e lista, agrupar por status e manter informações suficientes para ler cartões sem abrir cada item. | OS em kanban e lista com filtros e status visíveis. O detalhe completo da OS fica em uma tela própria. |
| [Linear — contextual menus](https://linear.app/now/invisible-details)                                                                           | Ações frequentes podem ser acessadas por teclado ou por menus descobertos no contexto.                                   | Busca global `Ctrl/Cmd + K` e ações frequentes com rótulos claros.                                     |
| [Raycast — Search Bar](https://manual.raycast.com/search-bar)                                                                                   | Uma busca central pode localizar destinos e comandos; resultados e ações ficam agrupados.                                | Paleta de comandos para módulos e ações da oficina, sem substituir a navegação principal.              |
| [Stripe — Dashboard](https://support.stripe.com/topics/dashboard?locale=en-GB) e [Vercel — Projects overview](https://vercel.com/docs/projects) | Uma página inicial útil resume atividade e estados atuais, com acesso rápido aos detalhes relacionados.                  | Indicadores calculados dos dados de demonstração, pendências e veículos em atendimento.                |
| [Porsche — visualizador de veículos](https://newsroom.porsche.com/pdf/6e5bd72e-037b-4e9f-9804-bc65512c5fe9?print=)                              | Configuração visual e perspectiva ajudam a dar contexto ao produto automotivo.                                           | Usar profundidade CSS 3D leve e formas próprias; não baixar modelos ou imagens de veículos.            |

## Tokens adotados

- **Cores:** fundo grafite (`--background: oklch(0.165 0.006 255)`), superfícies de vidro e âmbar (`--primary: oklch(0.69 0.195 41)`) como destaque no tema escuro. O tema claro usa a classe `.light`; sucesso, alerta, erro e informação têm tokens próprios e rótulos com ícone.
- **Tipografia:** Manrope para interface e JetBrains Mono para placas, códigos de OS e números tabulares. As fontes são empacotadas localmente por `@fontsource`.
- **Forma e superfície:** `--radius: 0.875rem` (14px), bordas de baixo contraste e elevação em camadas. Cartões priorizam leitura e agrupamento, com brilho decorativo discreto.
- **Movimento:** transições de 450–700ms apenas em mudanças de contexto; feedback curto em ações. `prefers-reduced-motion` e a preferência da oficina reduzem ou desligam movimento.
- **Responsividade:** sidebar e dados densos no desktop; cartões e navegação inferior em telas estreitas; alvos de toque confortáveis durante a inspeção do veículo.

## Limites de implementação

Imagens de entrada, avarias, peças e entrega são ilustrações/placeholders gerados localmente e identificados como demonstração. Não há chamadas de runtime para sites de inspiração, upload real ou dependência de fontes remotas.
