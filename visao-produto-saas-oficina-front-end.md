# SaaS para oficinas mecânicas — visão do front-end

**Documento de alinhamento para apresentação aos sócios**  
**Escopo desta etapa:** experiência e protótipo navegável de front-end, com dados simulados.  
**Status:** proposta inicial para discussão.

## 1. Visão do produto

Construir uma plataforma simples e visual para a oficina acompanhar o relacionamento com clientes, os veículos atendidos, as ordens de serviço e a rotina financeira e administrativa. A ordem de serviço (OS) é o fio condutor: ela conecta o veículo que chegou, o diagnóstico, os serviços e peças, as evidências em fotos, a aprovação do cliente, a execução e a entrega.

O produto deve ajudar a oficina a responder rapidamente:

- Quais veículos estão na oficina e em que etapa cada um está?
- O que foi registrado na entrada e o que mudou até a entrega?
- Qual serviço ou peça aguarda aprovação, compra ou execução?
- Quanto a oficina faturou, recebeu ou ainda tem a receber?
- Qual é o histórico de cada cliente e veículo?

**Proposta de valor:** reunir a operação da oficina em um só lugar e tornar o atendimento mais transparente, organizado e fácil de acompanhar.

## 2. Objetivo desta etapa

Criar um front-end demonstrável para validar com os sócios a proposta de produto, os principais fluxos e a organização das telas. A demonstração usará dados fictícios e interações locais para parecer um produto real, sem depender de serviços externos.

O protótipo deverá permitir navegar pelos módulos, abrir registros, criar ou editar dados de demonstração, avançar etapas de uma OS e visualizar como fotos e informações apareceriam. Atualizações podem permanecer apenas durante a sessão ou no armazenamento local do navegador.

### Fora do escopo agora

- Banco de dados, API, autenticação real e múltiplas oficinas/usuários.
- Envio real de mensagens por WhatsApp, SMS ou e-mail.
- Upload e armazenamento permanente de fotos.
- Integrações bancárias, emissão fiscal, pagamentos e conciliação real.
- Cálculos contábeis, regras fiscais e relatórios oficiais.
- Aplicativo nativo para celular.

Esses itens podem ser avaliados em etapas posteriores. No protótipo, qualquer ação que normalmente dependeria deles deve ser identificada como demonstração ou simulada localmente.

## 3. Usuários principais

| Perfil | Necessidade principal | O que precisa encontrar na interface |
|---|---|---|
| Proprietário/gestor | Ter visão geral do negócio e tomar decisões | Indicadores, pendências, faturamento e desempenho da equipe |
| Atendente/consultor | Receber o cliente, registrar o veículo e acompanhar aprovações | Cadastro rápido, histórico, checklist, fotos e status da OS |
| Mecânico/técnico | Entender o serviço e registrar o que foi feito | OS objetiva, tarefas, peças, observações e evidências |
| Administrativo/financeiro | Controlar cobranças, despesas e pagamentos | Lançamentos claros, vencimentos e situação financeira |

Para a demonstração, os perfis podem ser apresentados como opções de interface, mas não devem aplicar permissões reais.

## 4. Navegação e mapa de telas

### Navegação principal

1. **Visão geral** — painel do dia e indicadores.
2. **Ordens de serviço** — quadro de trabalho e lista de OS.
3. **Clientes** — contatos, veículos e histórico.
4. **Veículos** — busca e histórico por placa/modelo.
5. **Financeiro** — contas a receber, contas a pagar e visão de caixa.
6. **Estoque e peças** — catálogo, saldo demonstrativo e peças usadas nas OS.
7. **Relatórios** — resumos operacionais e financeiros.
8. **Configurações** — dados da oficina e preferências visuais de demonstração.

### Telas prioritárias do protótipo

| Tela | Conteúdo essencial | Ações demonstráveis |
|---|---|---|
| Visão geral | OS abertas por etapa, veículos na oficina, aprovações pendentes, recebimentos do período e atividade recente | Abrir OS, filtrar período, acessar pendências |
| Lista/quadro de OS | Busca por número, placa ou cliente; filtros; visualização em lista e etapas | Criar OS, abrir detalhes, trocar visualização |
| Detalhe da OS | Resumo, status, cliente, veículo, checklist, serviços, peças, fotos, aprovações e valores | Editar campos, adicionar serviço/peça, registrar evidência, avançar etapa |
| Entrada do veículo | Dados de chegada, quilometragem, combustível, avarias, pertences e fotos | Marcar checklist, adicionar fotos demonstrativas e salvar entrada |
| Inspeção e execução | Diagnóstico, tarefas, peças previstas/usadas, responsável e observações | Marcar tarefa, registrar peça e anexar evidência |
| Aprovação/orçamento | Serviços e peças sugeridos, valores e situação da aprovação | Simular aprovado, recusado ou aguardando retorno |
| Entrega do veículo | Checklist final, fotos de saída, resumo do serviço e confirmação | Registrar saída e concluir OS |
| Clientes e veículos | Cadastro, contato, veículos relacionados e histórico de serviços | Criar/editar cliente ou veículo, abrir histórico |
| Financeiro | Resumo de caixa, valores a receber/pagar e lançamentos | Criar lançamento demonstrativo, alterar situação |
| Estoque e peças | Peças cadastradas, saldo ilustrativo e movimentações | Buscar peça, selecionar em uma OS |
| Relatórios | Indicadores por período, serviços mais frequentes e produtividade ilustrativa | Aplicar filtros e alternar período |

## 5. Fluxo principal: da entrada à entrega

1. **Abrir uma OS:** localizar um cliente existente ou cadastrar um novo; selecionar ou adicionar o veículo.
2. **Registrar a entrada:** informar data e hora, quilometragem, nível de combustível, observações e itens deixados no carro. Preencher checklist visual de avarias e anexar fotos da chegada.
3. **Inspecionar e orçar:** registrar diagnóstico, serviços recomendados, peças e valores estimados. A OS fica aguardando aprovação quando houver orçamento enviado.
4. **Acompanhar aprovação:** apresentar status pendente, aprovado parcialmente, aprovado ou recusado. Na demonstração, os botões alteram apenas o estado local.
5. **Executar o serviço:** exibir tarefas por fazer/em andamento/concluídas, responsável, peças utilizadas e observações. Permitir anexar fotos das peças substituídas e do serviço.
6. **Preparar a entrega:** mostrar resumo do que foi realizado, itens recusados ou pendentes e valores. Preencher checklist de saída e registrar fotos finais do veículo.
7. **Concluir a OS:** mostrar horário de saída, situação do pagamento e histórico completo da ordem.

Em todas as etapas, a tela deve deixar visível o status atual, a próxima ação esperada e a linha do tempo de alterações.

### Etapas sugeridas para o quadro de OS

**Entrada → Diagnóstico → Aguardando aprovação → Aguardando peça → Em execução → Pronto para retirada → Entregue**

Uma OS também pode ficar **Cancelada**. Pendências devem ser representadas por etiquetas claras, sem depender apenas de cores.

## 6. Conteúdo da ordem de serviço

O detalhe da OS deve funcionar como a tela central do produto e reunir:

- Número da OS, data de abertura, status e consultor responsável.
- Cliente e formas de contato.
- Veículo: placa, marca, modelo, ano, cor e quilometragem.
- Entrada: data/hora, nível de combustível, checklist e fotos iniciais.
- Reclamação relatada pelo cliente e diagnóstico técnico.
- Serviços: descrição, responsável, estado, mão de obra e valor.
- Peças: descrição/código, quantidade, custo e preço de venda.
- Evidências: fotos de entrada, inspeção, peças substituídas, execução e saída.
- Aprovação do orçamento e itens aceitos/recusados.
- Valores, pagamentos registrados na demonstração e saldo em aberto.
- Linha do tempo com eventos e notas.

### Fotos e evidências

No protótipo, prever uma galeria organizada por momento e tipo: **entrada do veículo**, **avarias**, **peças substituídas**, **execução** e **saída**. Cada cartão de foto deve permitir visualizar a imagem, exibir uma legenda e mostrar data/hora fictícia. Usar imagens de demonstração ou placeholders; não sugerir que as imagens foram enviadas a um servidor.

As fotos devem ser fáceis de comparar entre entrada e saída. A interface pode oferecer um seletor de categoria e uma prévia antes de adicionar a evidência.

## 7. Requisitos por módulo

### CRM: clientes e veículos

- Lista pesquisável por nome, telefone, placa ou modelo.
- Cadastro do cliente com nome, telefone, e-mail e observações.
- Um cliente pode ter vários veículos; cada veículo mantém seu próprio histórico.
- Perfil do cliente com últimas OS, valores e interações demonstrativas.
- Perfil do veículo com dados básicos e histórico de manutenção.
- Indicação visual de cliente novo, recorrente ou inativo, calculada apenas com os dados fictícios disponíveis.

### Operação e ordens de serviço

- Criar, consultar e editar OS de demonstração.
- Mostrar status por etapa e permitir localizar atrasos ou pendências.
- Checklist de entrada e saída com itens marcáveis.
- Separar diagnóstico, orçamento, aprovação e execução.
- Associar serviços, peças, responsáveis, valores e evidências à OS.
- Exibir histórico em ordem cronológica.

### Financeiro e administrativo

- Painel com entradas, saídas, saldo previsto e valores vencidos/pendentes.
- Listas de contas a receber e a pagar com descrição, vencimento, valor e situação.
- Lançamentos demonstrativos vinculados a uma OS quando aplicável.
- Filtros simples por período e situação.
- Resumo de faturamento por período e forma de pagamento fictícia.
- Exibir claramente que os valores são de demonstração e não têm integração bancária ou fiscal.

### Estoque e peças

- Catálogo demonstrativo com nome, código, categoria, custo, preço e saldo.
- Alertas visuais de estoque baixo, usando limites de exemplo.
- Seleção de peças na OS e distinção entre peça prevista e peça utilizada.
- Registro ilustrativo de entrada/saída de estoque.

### Relatórios

- OS por status e período.
- Faturamento demonstrativo por período.
- Serviços mais realizados e veículos atendidos.
- Indicadores básicos por responsável.
- Tabelas e gráficos com legenda, unidade e período selecionado.

## 8. Requisitos de experiência e interface

- Interface em português do Brasil, com datas no formato `dd/mm/aaaa` e moeda em reais (`R$`).
- Priorizar uso em computador na recepção e em tablet/celular durante a inspeção do veículo.
- Navegação consistente, com menu lateral no desktop e navegação adaptada em telas menores.
- Ações frequentes acessíveis: **Nova OS**, **Adicionar cliente**, **Registrar entrada** e **Registrar saída**.
- Status sempre acompanhado por texto; cor é apoio, nunca o único sinal.
- Formulários divididos por etapas ou seções, com campos obrigatórios identificados.
- Confirmação visual após salvar, alterar status ou concluir uma etapa.
- Estados de tela para lista vazia, busca sem resultados, carregamento simulado e ação concluída.
- Evitar tabelas excessivamente largas em celular; transformar dados em cartões ou permitir rolagem controlada.
- Usar linguagem direta, adequada a quem trabalha na oficina.

### Direção visual sugerida

Uma estética profissional e funcional, com fundo neutro, alto contraste, tipografia legível e uma cor de destaque consistente. Usar cartões para indicadores, etiquetas para status, ícones com rótulos e fotos em tamanho suficiente para inspeção. A interface deve transmitir organização e confiança, sem parecer um painel financeiro genérico.

## 9. Regras para o protótipo front-end

- Usar dados fictícios coerentes em todos os módulos: nomes, placas, OS, peças e valores devem se relacionar.
- Oferecer exemplos suficientes para demonstrar diferentes status e cenários, incluindo OS aguardando aprovação, em execução e pronta para retirada.
- Ações principais devem produzir uma resposta visível, mesmo que local: abrir modal, atualizar etiqueta, inserir item ou alterar etapa.
- Manter navegação e dados demonstrativos durante a sessão; persistência local pode ser usada se for simples.
- Fotos podem vir de arquivos de exemplo ou placeholders, identificados como conteúdo demonstrativo.
- Não mostrar indicadores como se fossem dados reais da oficina.
- Não incluir fluxo de login funcional nesta etapa; se houver uma tela de entrada, ela deve oferecer acesso à demonstração.

## 10. Critérios de aceite da demonstração

A demonstração está pronta para revisão dos sócios quando:

- For possível navegar por todos os módulos principais sem becos sem saída.
- For possível criar/abrir uma OS e percorrer o fluxo de entrada até entrega.
- A OS mostrar fotos categorizadas da entrada, das peças substituídas e da saída.
- For possível visualizar um cliente, seus veículos e o histórico relacionado.
- O painel e o financeiro mostrarem números coerentes com os dados fictícios.
- A interface funcionar em desktop e se adaptar a uma largura de tablet/celular.
- As ações simuladas e os dados de demonstração estiverem identificados com clareza.

## 11. Sequência sugerida de construção do front-end

1. Definir identidade visual básica, navegação e componentes comuns.
2. Construir visão geral e listagem/quadro de OS com dados fictícios.
3. Construir detalhe da OS e o fluxo de entrada, inspeção, aprovação, execução e entrega.
4. Incluir clientes, veículos e histórico.
5. Incluir financeiro, peças/estoque e relatórios demonstrativos.
6. Ajustar comportamento em tablet/celular e revisar a narrativa da apresentação.

## 12. Decisões para validar com os sócios

1. O cliente terá um portal próprio no produto futuro ou receberá atualizações por WhatsApp?
2. O foco inicial será oficina mecânica geral ou um segmento específico (por exemplo, autoelétrica, pneus ou estética automotiva)?
3. O controle financeiro deve começar como fluxo de caixa simples ou incluir contas a pagar/receber detalhadas?
4. O estoque será parte do primeiro produto ou apenas um catálogo de peças ligado às OS?
5. Quais evidências fotográficas são obrigatórias no processo de entrada e entrega?
6. Quais indicadores precisam aparecer primeiro para o proprietário?

---

**Resumo para apresentação:** o front-end deve contar uma história completa e fácil de entender: o cliente chega, o veículo é registrado com evidências, a oficina diagnostica e pede aprovação, executa o serviço, registra peças e fotos e entrega o veículo com histórico e valores organizados.
