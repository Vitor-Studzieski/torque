# Arquitetura de backend do Torque

## Decisões do piloto

- Aplicação e endpoints: Vercel Functions com Nitro integrado ao TanStack Start. As funções rodam no runtime Node.js e ficam na região de São Paulo (`gru1`), próxima ao Neon.
- Banco transacional: PostgreSQL no Neon, preferencialmente na região de São Paulo. A aplicação usa `DATABASE_URL` privada com o endpoint agrupado (hostname com `-pooler`); migrations usam uma credencial administrativa separada e conexão direta.
- Fotos: arquivos em bucket privado do Supabase Storage, em São Paulo (`sa-east-1`); o PostgreSQL Neon guarda apenas metadados e a chave privada do objeto.
- Autenticação: Clerk com convite para entrar na oficina. Papéis e autorização do produto ficam no banco do Torque.
- Piloto: de 1 a 3 oficinas, até 5 usuários por oficina; sem cobrança automatizada ou mensagens automáticas a clientes.
- Desenvolvimento e produção começam sem cadastros fictícios. O modo demonstração permanece isolado no navegador; contas com associação Clerk ativa usam o PostgreSQL da oficina.

O runtime Node da Vercel pode manter uma instância pequena de `pg.Pool` por processo aquecido. O pool do aplicativo reutiliza conexões, e o pooler do Neon suporta a escala das funções. Cada operação instala o contexto de RLS dentro da própria transação; nenhuma configuração de sessão deve sobreviver ao `COMMIT`.

## Fundação implementada

- A migration SQL inicial cobre oficinas e membros, clientes, veículos, estados atuais das OS, serviços e peças, checklist, avarias, fotos, histórico, estoque e movimentações, contas financeiras e auditoria.
- As tabelas operacionais carregam workshop_id, usam chaves estrangeiras compostas para manter relações dentro da mesma oficina e políticas PostgreSQL RLS.
- A migration preserva os status atuais do front; pagamento da OS é derivado dos lançamentos financeiros. Cada baixa de estoque deve atualizar saldo e ledger na mesma transação.
- O módulo de banco mantém um pool Node compartilhado por processo e fornece transações com contexto local da oficina para RLS. O runtime rejeita `DATABASE_URL` com superuser, `BYPASSRLS`, `CREATEDB`, `CREATEROLE`, replicação, propriedade das tabelas operacionais, associação a outros papéis, privilégios de apagar oficinas/memberships ou alterar auditoria, ou permissão para criar objetos no schema `public`; também aplica timeout de consulta de 10 segundos e lock de 3 segundos.
- A migration 0005 provisiona `torque_app_runtime_restricted` como role SQL sem associação a `neon_superuser`, revoga privilégios diretos antigos dessa role e concede somente as operações usadas pelo app. Também adiciona limites de requisição persistidos por oficina, usuário e operação, restringe `audit_events` a leitura/inclusão e impede a exclusão de oficinas, memberships ou eventos de auditoria.
- Usuários autenticados podem consultar apenas sua própria associação ativa antes de conhecer a oficina; associações sem aceite e contas com múltiplas oficinas permanecem bloqueadas.
- O serviço de autorização resolve identidade e associação no servidor e oferece transações com verificação de permissão por papel; telas e funções do cliente não são fontes de autorização.
- Convites de equipe são emitidos pela conta Clerk após autorização de owner/manager. O Torque grava `publicMetadata` na criação do convite pela API de backend do Clerk; esse campo do convite só pode ser definido pelo backend e é copiado para `User.publicMetadata` após o aceite. A aplicação valida os metadados contra o convite no PostgreSQL e exige e-mail verificado antes de criar a membership em transação.
- Owner e manager podem consultar membros e convites; o owner pode alterar perfis ou revogar memberships, e quem enviou um convite pode cancelá-lo. Essas operações validam papel e oficina no servidor.
- `npm run db:bootstrap` cria uma oficina inicial e associa seu primeiro owner em uma única transação; é uma operação administrativa local e não existe endpoint público para criar oficinas.
- GET `/api/health` verifica conexão, papel de runtime e tabelas de segurança necessárias sem revelar a conexão ou detalhes da falha.
- O comando `npm run db:migrate` aplica arquivos SQL em ordem, com lock consultivo e checksum para impedir edição silenciosa de migrations já aplicadas.
- O envio de fotos operacionais usa URL `PUT` assinada e curta para o endpoint S3 do Supabase Storage, confere tamanho e tipo real, reprocessa JPEG/PNG/WebP para WebP sem metadados e emite URL `GET` assinada após autorização. HEIC exige uma assinatura ISO-BMFF/HEIC válida e permanece no formato original porque os binários padrão do Sharp não decodificam HEVC. Uploads pendentes usam prefixo separado e expiração maior que a URL assinada; limites por oficina e por OS restringem o armazenamento.
- Clientes, veículos, ordens de serviço, estoque e movimentos, contas financeiras e dados da oficina carregam e gravam pelo PostgreSQL através de server functions do TanStack Start; sessão Clerk, papel, oficina e RLS são validados no servidor.
- A configuração Nitro usa o destino Vercel na implantação e Node localmente. Em desenvolvimento, Vite carrega os valores privados de `.env.local`; nenhum segredo usa o prefixo `VITE_`.

O projeto Neon `Torque` está provisionado em São Paulo e as migrations 0001–0005 estão aplicadas no banco `neondb`, com checksums registrados em `schema_migrations`. A role SQL `torque_app_runtime_restricted` foi criada sem associação administrativa, recebeu os privilégios mínimos e passou pela verificação de conexão do runtime; sua URL está em `.env.local`. A role antiga `torque_app_runtime` continua habilitada, mas o app local já não a usa; o Neon recusou desativar seu login via `neondb_owner`, então a limpeza final deve ser feita pelo gerenciamento de roles do Neon após confirmar que nenhuma implantação a utiliza. O banco permanece sem clientes, veículos, ordens, estoque ou lançamentos fictícios. O app Clerk `Torque` foi criado na instância de desenvolvimento com autenticação por e-mail e acesso somente por convite; a instância de produção aguarda um domínio próprio controlado pela oficina. A integração Vercel conectada não lista um projeto `torque`; antes de publicar, conecte o projeto e configure `DATABASE_URL` para a role restrita. As chaves Clerk de produção e as variáveis de Storage na Vercel continuam pendentes.

O adaptador de fotos foi direcionado ao protocolo S3 do Supabase Storage. O projeto `Torque Fotos` (`rpxjfhbcmfujeizbzrbe`) está ativo em São Paulo (`sa-east-1`), no Free; o bucket `work-order-photos` é privado, com limite de 20 MB e tipos JPEG, PNG, WebP e HEIC. O protocolo S3 está habilitado e o par ativo foi salvo somente no `.env.local` local. O par criado inicialmente foi revogado antes de uso. A chave S3 concede acesso total a todos os buckets do projeto e ignora RLS; como este projeto é dedicado ao Torque e possui apenas o bucket privado de fotos, proteja as credenciais e mantenha as verificações de oficina no backend do Torque. O [plano Free](https://supabase.com/pricing) inclui 1 GB de arquivos, 5 GB de transferência não armazenada em cache e 5 GB em cache, compartilhados pela organização; [projetos Free podem pausar após sete dias](https://supabase.com/docs/guides/platform/free-project-pausing) de pouca atividade. Nenhum complemento pago foi habilitado. Um PNG sintético foi enviado, validado com `HEAD`, lido e removido pelo SDK S3; o preflight CORS para `http://localhost:3000` retornou 200 e permitiu `PUT` com `Content-Type`. A conexão Storage ainda não está configurada na Vercel, e não há deploy.

## Hardening de segurança

- Builds de produção aceitam somente chaves Clerk `pk_live_` e `sk_live_`. Chaves de desenvolvimento ou uma chave ausente bloqueiam o acesso operacional.
- Migrations e bootstrap exigem `DATABASE_ADMIN_URL`; não há alternativa por `DATABASE_URL`. O bootstrap consulta a API Clerk e associa apenas uma conta com ID e e-mail verificado correspondentes.
- Comandos operacionais, convites, fotos, links assinados e leitura do snapshot têm limites persistidos no PostgreSQL por usuário/oficina. O payload operacional fica limitado a 32 KiB.
- A trilha registra comandos, alterações de equipe, convites, bootstrap e ações com fotos sem guardar e-mail, conteúdo de formulário, URLs assinadas ou credenciais. O runtime consegue incluir e ler eventos, mas não atualizá-los nem apagá-los.
- GitHub Actions executa auditoria npm, lint e build em push, pull request e semanalmente. Dependabot verifica dependências npm e Actions toda semana.
- `vercel.json` adiciona HSTS, `nosniff`, bloqueio de frames, `Referrer-Policy` e `Permissions-Policy`. A CSP está em `Report-Only` até ser conferida em um deployment com o Clerk de produção; depois deve ser aplicada obrigatoriamente.
- O endpoint de Storage aceita somente o host HTTPS oficial `*.storage.supabase.co`; arquivos JPEG/PNG/WebP são convertidos no servidor e URLs de leitura usam `private, no-store`.

## Autenticação

- No ambiente local, configure `VITE_CLERK_PUBLISHABLE_KEY` em `.env.local` para o cliente e `CLERK_SECRET_KEY` em `.env.local` para o servidor; ambos permanecem fora do Git.
- Em Vercel, configure `VITE_CLERK_PUBLISHABLE_KEY` como variável pública de build e `CLERK_SECRET_KEY` como variável privada do servidor. Nunca exponha a chave secreta com prefixo `VITE_`.
- Para fotos, configure somente no servidor `SUPABASE_STORAGE_ENDPOINT`, `SUPABASE_STORAGE_REGION`, `SUPABASE_STORAGE_ACCESS_KEY_ID`, `SUPABASE_STORAGE_SECRET_ACCESS_KEY` e `SUPABASE_STORAGE_BUCKET`. Use o endpoint `https://rpxjfhbcmfujeizbzrbe.storage.supabase.co/storage/v1/s3` e a região `sa-east-1`; mantenha o bucket privado e nunca exponha essas credenciais no navegador. A chave S3 é privilegiada e não substitui a autorização do Torque.
- A instância Clerk deve aceitar cadastro somente por convite antes de produção. A rota `/convite` é para resgatar convites e não substitui essa configuração.
- Sem chave pública, a demonstração de interface fica disponível em desenvolvimento, agora sem cadastros fictícios. Em produção, as rotas de negócio ficam bloqueadas.
- Após autenticar, a aplicação valida a associação ativa usando o identificador vindo da sessão Clerk. Sem associação, com mais de uma associação, ou sem conexão ao banco, o acesso fica bloqueado. Com associação ativa, os módulos operacionais carregam exclusivamente os dados da oficina no PostgreSQL; o perfil de demonstração continua isolado no navegador.

## Banco e migrations

1. As migrations 0001–0005 estão aplicadas em `neondb`. `DATABASE_URL` local e Production usam `torque_app_runtime_restricted`, role SQL sem associação a `neon_superuser`; autenticação e privilégios mínimos foram verificados pelo comando de migration. A role legada `torque_app_runtime` foi removida do Neon.
2. O projeto `torque` existe na equipe Vercel. `DATABASE_URL` e as variáveis do Supabase Storage estão configuradas somente em Production; o repositório ainda precisa ser conectado antes do primeiro deploy. Antes de ativar Preview, crie uma branch Neon isolada e use a conexão agrupada dessa branch; não aponte previews para os dados reais.
3. Use `DATABASE_ADMIN_URL` local com o papel `neondb_owner` e conexão direta para `npm run db:migrate` e `npm run db:bootstrap`. Ambos os comandos falham se ela estiver ausente e não usam `DATABASE_URL` como alternativa. Nunca cadastre a conexão administrativa na Vercel; não execute migrations no boot das funções. O bootstrap também exige `CLERK_SECRET_KEY` e confirma a conta owner na API Clerk.
4. Depois de aplicar uma migration em qualquer ambiente compartilhado, não altere seu arquivo. Adicione outro arquivo numerado em `database/migrations`.
5. Para o piloto, crie primeiro o usuário owner na instância Clerk, configure `TORQUE_BOOTSTRAP_OWNER_CLERK_ID`, `TORQUE_BOOTSTRAP_OWNER_NAME`, `TORQUE_BOOTSTRAP_OWNER_EMAIL` e `TORQUE_BOOTSTRAP_WORKSHOP_NAME` no ambiente local e execute `npm run db:bootstrap` com a conexão administrativa apropriada. O script lê `.env.local` e `.env`.

O usuário de runtime deve ser distinto do dono do banco e das migrations. As policies RLS complementam as verificações de autorização da aplicação; elas não substituem a validação de sessão Clerk e de papel.

## Limites de segurança e próxima sequência

- `workshopId` e papel devem ser obtidos de uma sessão Clerk verificada e da associação ativa no PostgreSQL. Nunca confiar nesses valores quando enviados pelo navegador.
- Cada endpoint precisa validar sessão, oficina, papel e propriedade dos recursos. O helper de transação apenas instala o contexto RLS; ele não autentica ninguém.
- O provisionamento idempotente da associação no aceite do convite está implementado. As consultas e gravações operacionais usam `withAuthorizedWorkshopTransaction`; mecânicos consultam e alteram somente OS atribuídas a eles. Para ativar o piloto, conecte o repositório ao projeto Vercel, configure as variáveis Clerk de produção após definir um domínio próprio e crie a oficina/owner reais com `npm run db:bootstrap`.
- Fotos não são guardadas no PostgreSQL. O banco contém apenas os metadados e a chave privada do objeto. O navegador recebe URLs assinadas de curta duração depois da autorização no servidor; mantenha o bucket privado. A API S3 do Supabase não implementa operações de configuração CORS de bucket; valide o `PUT` assinado no domínio Vercel real.
- A política de retenção e os processos de exportação/exclusão devem ser definidos antes do piloto, conforme a decisão já tomada pelo time.
- Nenhum segredo, conexão ou dado real de cliente deve entrar no Git.
- Antes do piloto, ative a instância Clerk de produção com domínio próprio, cadastro por convite e MFA para contas administrativas; configure `VITE_CLERK_PUBLISHABLE_KEY` como configuração pública e `CLERK_SECRET_KEY` e credenciais Supabase como variáveis privadas na Vercel; revise backups/alertas dos planos Neon e Supabase Free; confira a CSP em deployment real; e habilite proteção de branch, revisão obrigatória e secret scanning nas configurações GitHub. Essas ações dependem dos painéis externos e de um domínio controlado.
- Rode `npm run security:audit` para auditar as dependências localmente; o workflow GitHub também bloqueia vulnerabilidades npm de severidade alta.
