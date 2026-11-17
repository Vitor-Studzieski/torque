# Oficina Fluxo Integral

{
  "projeto": {
    "nome_provisorio": "Torque",
    "descricao": "Plataforma web para oficinas mecânicas acompanharem clientes, veículos, ordens de serviço (OS), financeiro e estoque. A OS é o fio condutor: conecta entrada do veículo, diagnóstico, orçamento, aprovação, execução, fotos e entrega.",
    "objetivo_desta_etapa": "Protótipo navegável, apenas front-end, com dados fictícios, para apresentar e validar a proposta com os sócios. Deve parecer um produto real, premium e pronto para venda.",
    "idioma_da_interface": "Português do Brasil, datas dd/mm/aaaa, moeda R$ (ex.: R$ 1.250,00)"
  },

  "papel_da_ia": "Você é um designer de produto sênior e engenheiro front-end especializado em interfaces SaaS premium, com foco em motion design e profundidade 3D. Entregue acabamento de estúdio, não um template genérico.",

  "pesquisa_de_inspiracao": {
    "instrucao": "ANTES de escrever código, pesquise na internet referências visuais e de interação e use-as para definir a direção de arte. Se não tiver acesso à web, use as referências abaixo como base e diga isso ao final.",
    "o_que_pesquisar": [
      "dashboards SaaS premium e modernos (linear.app, stripe.com, vercel.com, raycast.com, framer.com)",
      "transições de página 3D, flip, parallax em camadas e cartões com profundidade (awwwards.com, dribbble.com, godly.website, land-book.com)",
      "experiências automotivas de alto nível (sites de configuradores e apps de marcas como Porsche, Tesla e Polestar)",
      "quadros kanban e timelines de status bem resolvidos (Linear, Height, Notion)",
      "galerias de fotos antes/depois com comparador deslizante",
      "Spline (spline.design) e React Three Fiber para elementos 3D leves na web"
    ],
    "o_que_extrair": [
      "sistema de tipografia, espaçamento e grade",
      "paleta, superfícies, sombras, bordas e brilhos",
      "padrões de microinteração e de transição entre telas",
      "hierarquia de informação em painéis densos"
    ],
    "regra": "Inspire-se em princípios, não copie layouts, marcas, textos ou ilustrações de nenhum site. Não cite sites no produto final."
  },

  "stack": {
    "base": "React + Vite + TypeScript + Tailwind CSS + shadcn/ui",
    "animacao": "framer-motion para transições de página, layout animations e gestos",
    "3d": "CSS 3D transforms (perspective, rotateX/Y, translateZ) como padrão; @react-three/fiber + drei apenas em 1 ou 2 momentos de destaque (ex.: hero da tela de entrada e fundo sutil do painel), sempre com carregamento tardio (lazy)",
    "graficos": "recharts",
    "icones": "lucide-react",
    "roteamento": "react-router-dom",
    "estado": "Zustand ou Context com persistência em localStorage; sem backend, sem chamadas de rede, sem autenticação real"
  },

  "escopo": {
    "dentro": [
      "navegação completa entre todos os módulos sem becos sem saída",
      "criar e editar dados de demonstração (OS, clientes, veículos, lançamentos, peças)",
      "avançar etapas de uma OS e ver a linha do tempo atualizar",
      "galeria de fotos por categoria usando placeholders e imagens de exemplo",
      "gráficos e indicadores coerentes com os dados fictícios"
    ],
    "fora": [
      "banco de dados, API, login real, múltiplos usuários ou oficinas",
      "envio real de WhatsApp, SMS ou e-mail",
      "upload real e armazenamento de fotos",
      "pagamentos, integração bancária, emissão fiscal, regras contábeis",
      "aplicativo nativo"
    ],
    "regras_de_demonstracao": [
      "Exibir faixa discreta e fixa: Ambiente de demonstração, dados fictícios",
      "Ações que dependeriam de serviços externos (enviar orçamento por WhatsApp, cobrar, emitir nota) mostram um toast ou modal com o selo Simulado",
      "A tela inicial oferece o botão Entrar na demonstração; nenhum formulário de login funcional",
      "Seletor de perfil (Gestor, Atendente, Mecânico, Financeiro) apenas altera a visão e os atalhos, sem permissões reais",
      "Botão Restaurar dados de demonstração nas Configurações"
    ]
  },

  "identidade_visual": {
    "sensacao": "profissional, confiável, tecnológica e com personalidade automotiva; nunca parecer painel financeiro genérico",
    "tema": "modo escuro como padrão, com modo claro completo e alternância suave",
    "paleta": {
      "fundo": "grafite quase preto com leve gradiente (ex.: #0B0D10 a #12151A)",
      "superficies": "cartões com vidro fosco sutil (glassmorphism leve), borda de 1px com baixa opacidade e brilho interno",
      "destaque": "uma única cor de destaque forte e consistente (sugestão: laranja âmbar #FF6A2B ou ciano elétrico), usada em ações principais, foco e gráficos",
      "status": "verde, âmbar, vermelho e azul para estados, sempre acompanhados de texto e ícone"
    },
    "tipografia": "uma família geométrica moderna (ex.: Inter Tight, Manrope ou Plus Jakarta Sans) para interface e uma fonte mono (ex.: JetBrains Mono) para placas, números de OS e valores; hierarquia clara com poucos tamanhos",
    "componentes": "cantos arredondados de 12 a 20px, sombras em camadas, indicadores em cartões com sparkline, etiquetas de status em pílula, ícones sempre com rótulo",
    "contraste": "alto contraste e legibilidade (mínimo WCAG AA)",
    "assinatura": "placas de veículo estilizadas no padrão Mercosul como elemento visual recorrente; linhas finas de grade técnica no fundo do hero"
  },

  "movimento_e_3d": {
    "principio": "Movimento com propósito: explicar mudança de contexto e reforçar hierarquia. Fluido, rápido e elegante, nunca cansativo.",
    "transicoes_de_pagina": "Ao trocar de módulo, a tela atual recua em profundidade (translateZ negativo, leve rotateY e fade) enquanto a nova avança com easing suave; duração de 450 a 700 ms; usar AnimatePresence e layout animations",
    "cartao_para_detalhe": "Ao abrir uma OS a partir do quadro ou da lista, o cartão se expande para a tela de detalhe com shared layout transition (efeito de zoom contínuo), sem corte brusco",
    "kanban": "Cartões com tilt 3D sutil ao passar o mouse (inclinação seguindo o cursor, brilho especular), arrastar e soltar entre etapas com sombra elevada e reordenação animada",
    "flip_3d": "Cartão de aprovação e comparador de fotos usam flip 3D (frente e verso) para alternar entre Entrada e Saída",
    "galeria": "Galeria de fotos em carrossel 3D (coverflow) com profundidade; lightbox com transição de layout; comparador antes/depois com divisor arrastável",
    "hero_3d": "Na tela de entrada da demonstração, uma cena 3D leve e estilizada (carro low-poly ou chassi/engrenagens abstratos) com rotação lenta e resposta ao mouse; fallback em imagem estática",
    "micro_interacoes": [
      "contadores animados nos indicadores",
      "gráficos que desenham ao entrar na tela",
      "botões com feedback de pressão e brilho",
      "linha do tempo da OS que se constrói em cascata",
      "skeletons com shimmer no carregamento simulado",
      "confetti sutil ao concluir uma OS"
    ],
    "performance_e_acessibilidade": [
      "manter 60 fps; animar apenas transform e opacity; usar will-change com cuidado",
      "respeitar prefers-reduced-motion: trocar 3D e parallax por fades simples",
      "carregar Three.js sob demanda; no celular reduzir ou desligar a cena 3D"
    ]
  },

  "navegacao": {
    "desktop": "menu lateral recolhível com ícones e rótulos, busca global (atalho Ctrl+K) e botões fixos de ações frequentes: Nova OS, Adicionar cliente, Registrar entrada, Registrar saída",
    "tablet_e_celular": "barra inferior com os 4 módulos principais e menu Mais; cartões no lugar de tabelas largas; alvos de toque grandes para uso durante a inspeção do veículo",
    "modulos": [
      "Visão geral",
      "Ordens de serviço",
      "Clientes",
      "Veículos",
      "Financeiro",
      "Estoque e peças",
      "Relatórios",
      "Configurações"
    ]
  },

  "telas": [
    {
      "nome": "Entrada da demonstração",
      "conteudo": "Hero com cena 3D, proposta de valor em uma frase, botão Entrar na demonstração e seletor de perfil",
      "acoes": ["entrar na demonstração", "escolher perfil"]
    },
    {
      "nome": "Visão geral",
      "conteudo": "Cartões de indicadores (OS abertas, veículos na oficina, aprovações pendentes, recebido no período, a receber), funil de OS por etapa, lista Veículos na oficina agora, pendências do dia e atividade recente",
      "acoes": ["filtrar período", "abrir OS", "acessar pendências"]
    },
    {
      "nome": "Ordens de serviço",
      "conteudo": "Quadro kanban e lista alternáveis com animação; busca por número, placa ou cliente; filtros; etiquetas de atraso e pendência",
      "etapas": ["Entrada", "Diagnóstico", "Aguardando aprovação", "Aguardando peça", "Em execução", "Pronto para retirada", "Entregue", "Cancelada"],
      "acoes": ["criar OS", "trocar visualização", "arrastar entre etapas", "abrir detalhe"]
    },
    {
      "nome": "Detalhe da OS (tela central)",
      "conteudo": "Cabeçalho com número, status, consultor e próxima ação esperada; abas ou seções: Resumo, Entrada, Diagnóstico e orçamento, Execução, Fotos, Financeiro, Linha do tempo; stepper de progresso animado; painel lateral com cliente e veículo",
      "acoes": ["editar campos", "adicionar serviço", "adicionar peça", "registrar evidência", "avançar etapa"]
    },
    {
      "nome": "Entrada do veículo",
      "conteudo": "Formulário em etapas: dados de chegada, quilometragem, combustível (medidor visual), pertences, reclamação do cliente, checklist de avarias com silhueta do carro clicável e fotos demonstrativas",
      "acoes": ["marcar avarias na silhueta", "adicionar fotos de exemplo", "salvar entrada"]
    },
    {
      "nome": "Inspeção e execução",
      "conteudo": "Diagnóstico técnico, tarefas em Por fazer, Em andamento e Concluídas, responsável, peças previstas versus utilizadas, observações e evidências",
      "acoes": ["marcar tarefa", "registrar peça", "anexar evidência"]
    },
    {
      "nome": "Aprovação do orçamento",
      "conteudo": "Serviços e peças sugeridos com valores, aprovação por item (aprovado, recusado, aguardando retorno) e total recalculado em tempo real",
      "acoes": ["simular aprovação total, parcial ou recusa", "simular envio por WhatsApp (selo Simulado)"]
    },
    {
      "nome": "Entrega do veículo",
      "conteudo": "Checklist final, fotos de saída, comparador Entrada x Saída, resumo do serviço, itens recusados, situação do pagamento",
      "acoes": ["registrar saída", "concluir OS com animação de celebração"]
    },
    {
      "nome": "Clientes",
      "conteudo": "Lista pesquisável (nome, telefone, placa, modelo), perfil com veículos, últimas OS, valores e interações; selo Novo, Recorrente ou Inativo calculado sobre os dados fictícios",
      "acoes": ["criar e editar cliente", "abrir histórico"]
    },
    {
      "nome": "Veículos",
      "conteudo": "Busca por placa ou modelo, perfil do veículo com histórico de manutenção em linha do tempo vertical",
      "acoes": ["criar e editar veículo", "abrir OS relacionada"]
    },
    {
      "nome": "Financeiro",
      "conteudo": "Resumo de caixa (entradas, saídas, saldo previsto, vencidos), contas a receber e a pagar, lançamentos vinculados a OS, filtros por período e situação, aviso claro de valores de demonstração",
      "acoes": ["criar lançamento", "alterar situação", "filtrar"]
    },
    {
      "nome": "Estoque e peças",
      "conteudo": "Catálogo com nome, código, categoria, custo, preço e saldo; alerta visual de estoque baixo; movimentações ilustrativas; distinção entre peça prevista e utilizada na OS",
      "acoes": ["buscar peça", "selecionar peça em uma OS", "registrar entrada ou saída"]
    },
    {
      "nome": "Relatórios",
      "conteudo": "OS por status e período, faturamento por período e forma de pagamento fictícia, serviços mais realizados, veículos atendidos, produtividade por responsável; gráficos com legenda, unidade e período",
      "acoes": ["alternar período", "aplicar filtros"]
    },
    {
      "nome": "Configurações",
      "conteudo": "Dados da oficina, tema claro ou escuro, intensidade de animações (completa, reduzida, desligada), restaurar dados de demonstração",
      "acoes": ["salvar preferências", "restaurar demonstração"]
    }
  ],

  "dados_ficticios": {
    "regra": "Dados coerentes entre todos os módulos: o mesmo cliente, placa, OS, peça e valor devem aparecer igual em qualquer tela; indicadores e gráficos devem somar corretamente a partir desses dados.",
    "volume_minimo": "12 clientes, 18 veículos, 25 OS em estados variados, 30 peças, 40 lançamentos financeiros e 4 mecânicos",
    "cenarios_obrigatorios": [
      "OS aguardando aprovação com orçamento pendente",
      "OS aguardando peça com peça em falta no estoque",
      "OS em execução com tarefas parciais e fotos de peças substituídas",
      "OS pronta para retirada com pagamento pendente",
      "OS entregue com comparador Entrada x Saída completo",
      "OS atrasada com etiqueta de atraso",
      "cliente novo, recorrente e inativo",
      "conta a pagar vencida e conta a receber a vencer"
    ],
    "formato": "placas no padrão Mercosul (ex.: BRA2E19), nomes brasileiros comuns, telefones fictícios com DDD, valores realistas em R$",
    "imagens": "placeholders ou imagens de exemplo gerados localmente, sempre rotulados como conteúdo demonstrativo"
  },

  "fluxo_principal": [
    "Abrir OS: localizar ou cadastrar cliente e selecionar ou adicionar veículo",
    "Registrar entrada: data e hora, quilometragem, combustível, pertences, checklist de avarias e fotos",
    "Inspecionar e orçar: diagnóstico, serviços, peças e valores; OS vai para Aguardando aprovação",
    "Acompanhar aprovação: pendente, parcial, aprovada ou recusada (estado local)",
    "Executar: tarefas, responsável, peças usadas, fotos da execução",
    "Preparar entrega: resumo, itens recusados, checklist de saída, fotos finais",
    "Concluir: horário de saída, situação do pagamento e histórico completo"
  ],

  "regras_de_ux": [
    "Em todas as telas de OS, deixar visíveis o status atual, a próxima ação esperada e a linha do tempo",
    "Status sempre com texto e ícone, nunca só cor",
    "Campos obrigatórios identificados; formulários divididos em seções ou etapas",
    "Confirmação visual (toast) após salvar, mudar status ou concluir etapa",
    "Estados prontos: lista vazia, busca sem resultados, carregamento simulado (skeleton) e ação concluída",
    "Linguagem direta, adequada a quem trabalha na oficina"
  ],

  "criterios_de_aceite": [
    "Navegação por todos os módulos sem becos sem saída",
    "Fluxo completo de uma OS, da entrada à entrega, funcionando",
    "Fotos categorizadas (entrada, avarias, peças substituídas, execução, saída) com comparador Entrada x Saída",
    "Cliente com veículos e histórico relacionados",
    "Painel, financeiro e relatórios com números coerentes com os dados fictícios",
    "Layout responsivo para desktop, tablet e celular",
    "Transições 3D fluidas, com fallback para reduced motion",
    "Ações simuladas e dados de demonstração claramente identificados"
  ],

  "ordem_de_construcao": [
    "Fase 1: pesquisa de inspiração, direção de arte, design tokens, tema claro e escuro, layout base, navegação e componentes comuns",
    "Fase 2: dados fictícios, tela de entrada com hero 3D, Visão geral e Ordens de serviço (kanban e lista)",
    "Fase 3: Detalhe da OS e fluxo de entrada, orçamento, aprovação, execução e entrega, com galeria e comparador",
    "Fase 4: Clientes, Veículos, Financeiro, Estoque e Relatórios",
    "Fase 5: transições 3D globais, micro-interações, responsividade, acessibilidade e revisão final"
  ],

  "restricoes": [
    "Não criar backend, banco de dados, autenticação real nem chamadas externas",
    "Não usar dados pessoais reais",
    "Não copiar marcas, logotipos, textos ou layouts de terceiros",
    "Manter o código organizado em componentes reutilizáveis e tipado",
    "Priorizar acabamento visual e fluidez em vez de quantidade de recursos"
  ],

  "instrucao_final": "Siga a ordem de construção. Ao fim de cada fase, resuma o que foi entregue e aguarde o próximo comando. Se algo for ambíguo, escolha a opção mais profissional e registre a suposição em uma linha."
}

## Development

Requisitos: Bun e Node.js.

```sh
bun install
bun run dev
```
