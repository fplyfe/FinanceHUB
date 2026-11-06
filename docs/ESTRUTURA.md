# Estrutura do projeto — FinanceHub

Mapa completo do repositório: o que cada pasta e arquivo faz, o modelo de dados, as telas e a API.

## 1. Visão geral

```
Internet ─► Nginx (80/443 · TLS · rate limit) ─► app Next.js (:3000) ─► PostgreSQL (rede interna)
                 ▲                                    │
            certbot (renova TLS)              backup (pg_dump diário → ./backups)
```

| Camada | Tecnologia | Onde fica |
| --- | --- | --- |
| Telas | Next.js 15 (App Router) + React 19 + Tailwind + componentes estilo shadcn/ui | `src/app/(app)`, `src/components` |
| API REST | Route Handlers do Next + validação Zod | `src/app/api` |
| Regras de negócio | TypeScript puro | `src/lib` |
| Banco | PostgreSQL 16 via Prisma 6 | `prisma/` |
| Infra | Docker Compose, Nginx, Certbot, backup | raiz, `nginx/`, `scripts/` |

**Fluxo de uma página:** o Server Component (`page.tsx`) lê o banco direto via Prisma e passa os dados ao componente cliente (`*-view.tsx`).
**Fluxo de uma ação** (salvar, excluir…): o componente cliente chama a API (`fetch`); a rota valida com Zod, aplica a regra em `src/lib` e grava. Depois, `router.refresh()` recarrega os dados da página.

## 2. Árvore comentada

```
financehub/

├── .dockerignore                 o que não entra na imagem Docker
├── .env.example                  modelo de variáveis de ambiente (copie para .env)
├── .gitattributes                força finais de linha LF (scripts .sh no Linux)
├── .gitignore                    ignora node_modules, .next, .env, backups, certificados
├── Dockerfile                    build multi-stage: deps → migrator → builder → runner (não-root)
├── README.md                     visão geral, funcionalidades, como rodar
├── components.json               configuração do shadcn/ui (para adicionar componentes)
├── docker-compose.yml            PRODUÇÃO: db, migrate, app, nginx, certbot, backup
├── docker-compose.dev.yml        DESENVOLVIMENTO: só o Postgres em localhost:5433
├── next.config.mjs               output standalone, headers de segurança
├── package.json                  dependências e scripts (dev, build, db:*)
├── package-lock.json             versões travadas das dependências
├── postcss.config.mjs            Tailwind + autoprefixer
├── tailwind.config.ts            tema (cores via variáveis CSS, modo escuro)
├── tsconfig.json                 TypeScript estrito, alias @/* → src/*
│
├── docs/
│   ├── DEPLOY.md                 plano de implantação na VPS passo a passo
│   └── ESTRUTURA.md              este documento
│
├── nginx/templates/
│   ├── default.conf.template     servidor HTTP→HTTPS, TLS, HSTS, gzip, rate limit (${DOMAIN})
│   └── proxy_params.inc          cabeçalhos de proxy reutilizados
│
├── prisma/
│   ├── schema.prisma             modelo de dados (ver seção 3)
│   ├── seed.ts                   cria os 2 usuários iniciais (admins) e as categorias padrão
│   └── migrations/
│       ├── migration_lock.toml
│       ├── 0001_init/            tabelas base (usuários, contas, cartões, lançamentos…)
│       ├── 0002_investments/     investimentos e movimentações
│       └── 0003_user_management/ perfil, ativo, versão de sessão, último acesso
│
├── public/                       arquivos estáticos (vazio por enquanto)
│
├── scripts/
│   ├── setup-vps.sh              instala Docker, firewall UFW, fail2ban, swap, updates
│   ├── init-letsencrypt.sh       emite o 1º certificado HTTPS e sobe o Nginx
│   ├── deploy.sh                 backup → git pull → build → migrations → restart
│   ├── backup.sh                 backup manual (+ envio opcional via rclone)
│   └── restore.sh                restaura um .sql.gz (com confirmação)
│
└── src/
    ├── middleware.ts             bloqueia rotas sem sessão (redireciona /login ou 401)
    │
    ├── app/
    │   ├── layout.tsx            HTML raiz, tema claro/escuro sem "flash"
    │   ├── globals.css           variáveis de cor (claro/escuro) e base Tailwind
    │   ├── icon.svg              favicon
    │   ├── page.tsx              "/" → redireciona para /dashboard
    │   ├── login/page.tsx        tela de login
    │   │
    │   ├── (app)/                ÁREA AUTENTICADA (o grupo não aparece na URL)
    │   │   ├── layout.tsx        valida sessão, gera recorrências vencidas, menu lateral
    │   │   ├── dashboard/        visão geral do mês
    │   │   ├── transactions/     lançamentos (+ formulário reutilizado de receita/despesa)
    │   │   ├── accounts/         contas bancárias
    │   │   ├── cards/            cartões e faturas
    │   │   ├── transfers/        transferências entre contas
    │   │   ├── installments/     parcelamentos
    │   │   ├── recurring/        contas recorrentes
    │   │   ├── investments/      carteira de investimentos
    │   │   ├── net-worth/        balanço patrimonial
    │   │   ├── goals/            metas
    │   │   ├── reports/          relatórios e exportação
    │   │   ├── users/            gestão de usuários
    │   │   └── settings/         categorias, meu perfil, senha
    │   │       (cada pasta: page.tsx = servidor/dados · *-view.tsx = interface cliente)
    │   │
    │   └── api/                  API REST (ver seção 5)
    │
    ├── components/
    │   ├── ui/                   componentes base no padrão shadcn/ui
    │   │   ├── button.tsx        botão com variantes (default, outline, ghost, destructive…)
    │   │   ├── card.tsx          Card, CardHeader, CardTitle, CardContent
    │   │   ├── dialog.tsx        modal acessível (Radix)
    │   │   ├── input.tsx         Input, Textarea, Select, Label, Field
    │   │   └── misc.tsx          Badge, Progress, Dot, PageHeader, Empty
    │   └── app/                  componentes da aplicação
    │       ├── sidebar.tsx       menu lateral (desktop) e gaveta (celular), tema, sair
    │       ├── form-dialog.tsx   FormDialog (modal com formulário), ActionButton, DeleteButton
    │       ├── month-nav.tsx     navegação ‹ mês › via ?month=AAAA-MM
    │       └── dashboard-charts.tsx  gráficos Recharts (barras, pizza, patrimônio)
    │
    └── lib/                      REGRAS E UTILITÁRIOS
        ├── db.ts                 cliente Prisma único, conversão Decimal→number (plain)
        ├── auth.ts               criar/validar sessão JWT (conferida no banco)
        ├── api.ts                route(): autenticação, perfil admin, erros → JSON
        ├── validators.ts         todos os schemas Zod de entrada
        ├── finance.ts            saldos, faturas, regras de lançamento, parcelas, recorrências
        ├── investments.ts        posição por custo médio, patrimônio, histórico mensal
        ├── reports.ts            agregação de relatórios por período/categoria
        ├── queries.ts            filtros e consulta de lançamentos
        ├── users.ts              campos públicos e regra "sempre 1 admin ativo"
        ├── dates.ts              datas sem fuso (AAAA-MM-DD), meses, fechamento de fatura
        ├── utils.ts              cn(), formatação R$/data, rótulos em português
        └── client.ts             helper fetch para os componentes cliente
```

## 3. Modelo de dados (`prisma/schema.prisma`)

| Tabela | Para que serve | Campos principais |
| --- | --- | --- |
| `User` | Quem acessa o sistema | nome, e-mail, hash da senha, `role` (ADMIN/MEMBER), `active`, `sessionVersion`, `lastLoginAt` |
| `Account` | Contas (corrente, poupança, dinheiro, investimento, carteira) | nome, tipo, saldo inicial, cor, arquivada |
| `CreditCard` | Cartões de crédito | limite, dia de fechamento, dia de vencimento, conta padrão de pagamento |
| `Category` | Categorias de receita/despesa | nome, tipo, cor |
| `Transaction` | Todo lançamento: receita, despesa ou transferência | tipo, valor, data, status (PENDING/PAID), conta, conta destino, cartão, categoria, autor, parcela, recorrência |
| `InstallmentPlan` | Compra parcelada (gera N lançamentos) | descrição, total, nº de parcelas, 1ª data, conta/cartão |
| `Recurring` | Regra de conta recorrente | valor, frequência, início/fim, próxima data, débito automático, ativa |
| `Goal` / `GoalContribution` | Metas e seus aportes/resgates | alvo, acumulado, prazo |
| `Investment` / `InvestmentEntry` | Investimentos e movimentações | tipo de ativo, instituição · aporte/resgate/atualização de valor, conta ligada |

**Regras importantes**

- **Saldo da conta** = saldo inicial + receitas pagas − despesas pagas ± transferências − aportes + resgates de investimentos. É calculado e não fica gravado (`lib/finance.ts › accountBalances`).
- **Cartão:** a compra fica `PENDING` (consome limite, não mexe no saldo). Ao **pagar a fatura**, os itens viram `PAID` na conta escolhida. A fatura de cada compra depende do dia de fechamento (`lib/dates.ts › invoiceMonth`).
- **Parcelamento:** divide o total em centavos, e o resto vai para as primeiras parcelas.
- **Recorrências:** os lançamentos são criados quando alguém abre o app, de forma idempotente e segura contra dois acessos simultâneos.
- **Investimentos:** a posição usa o custo médio. Uma "atualização de valor" define o valor de mercado e a diferença vira rendimento.
- **Patrimônio** = contas positivas + investimentos − (dívida dos cartões + contas negativas).
- **Exclusões:** conta/cartão com histórico são **arquivados**; usuário com lançamentos é **desativado**.

## 4. Telas

| URL | Tela | Arquivos |
| --- | --- | --- |
| `/login` | Login | `app/login/page.tsx` |
| `/dashboard` | Patrimônio, receitas/despesas do mês, faturas, gráficos, vencimentos, metas | `(app)/dashboard/page.tsx` |
| `/transactions` | Lançamentos com filtros, novo/editar, pago/pendente, parcelado | `(app)/transactions/*` |
| `/accounts` | Contas e saldos | `(app)/accounts/*` |
| `/cards` | Cartões, limite, faturas, pagar fatura | `(app)/cards/*` |
| `/transfers` | Transferências entre contas | `(app)/transfers/*` |
| `/installments` | Parcelamentos e progresso | `(app)/installments/*` |
| `/recurring` | Contas recorrentes (pausar, editar, gerar agora) | `(app)/recurring/*` |
| `/investments` | Carteira, rentabilidade, alocação, histórico | `(app)/investments/*` |
| `/net-worth` | Ativos, passivos, patrimônio líquido, evolução 12 meses | `(app)/net-worth/page.tsx` |
| `/goals` | Metas, aportes e resgates | `(app)/goals/*` |
| `/reports` | Relatório por período + download PDF/Excel | `(app)/reports/page.tsx` |
| `/users` | Gestão de usuários (ações só para administradores) | `(app)/users/*` |
| `/settings` | Categorias, meu perfil, alterar senha | `(app)/settings/*` |

## 5. API REST (`src/app/api`)

Toda rota exige sessão, exceto login e health. Respostas em JSON; erros no formato `{ "error": "mensagem" }`.
🔒 = somente administrador.

| Método e rota | O que faz |
| --- | --- |
| `POST /api/auth/login` | Entrar (limite de tentativas por IP) |
| `POST /api/auth/logout` | Sair |
| `POST /api/auth/password` | Alterar a própria senha |
| `PUT /api/auth/profile` | Alterar o próprio nome/e-mail |
| `GET /api/health` | Verificação de saúde (app + banco) |
| `GET·POST /api/users` | Listar · 🔒 cadastrar usuário |
| `PUT·DELETE /api/users/:id` | 🔒 editar (perfil, ativo) · 🔒 excluir (só sem histórico) |
| `POST /api/users/:id/password` | 🔒 redefinir senha de outro usuário |
| `GET·POST /api/accounts` | Listar com saldo · criar conta |
| `PUT·DELETE /api/accounts/:id` | Editar · excluir/arquivar |
| `GET·POST /api/cards` | Listar com limite usado · criar cartão |
| `PUT·DELETE /api/cards/:id` | Editar · excluir/arquivar |
| `GET /api/cards/:id/invoices` | Faturas agrupadas por mês |
| `POST /api/cards/:id/pay` | Pagar fatura `{ month, accountId }` |
| `GET·POST /api/categories` | Listar · criar categoria |
| `PUT·DELETE /api/categories/:id` | Editar · excluir |
| `GET·POST /api/transactions` | Listar (filtros `month, type, status, accountId, cardId, categoryId, q`) · criar |
| `PUT·PATCH·DELETE /api/transactions/:id` | Editar · alternar pago/pendente · excluir |
| `POST /api/transfers` | Transferir entre contas |
| `GET·POST /api/installments` | Listar · criar parcelamento |
| `DELETE /api/installments/:id` | Excluir parcelamento e parcelas |
| `GET·POST /api/recurring` | Listar · criar recorrência |
| `PUT·PATCH·DELETE /api/recurring/:id` | Editar · pausar/retomar · excluir |
| `POST /api/recurring/run` | Gerar lançamentos vencidos agora |
| `GET·POST /api/goals` | Listar · criar meta |
| `PUT·DELETE /api/goals/:id` | Editar · excluir |
| `POST /api/goals/:id/contribute` | Aporte (+) ou resgate (−) |
| `GET·POST /api/investments` | Listar com posição · criar investimento |
| `PUT·DELETE /api/investments/:id` | Editar · excluir com histórico |
| `POST /api/investments/:id/entries` | Aporte, resgate ou atualização de valor |
| `DELETE /api/investment-entries/:id` | Excluir movimentação |
| `GET /api/net-worth` | Balanço patrimonial + histórico (`?months=12`) |
| `GET /api/reports/pdf` | Relatório PDF (`?from=AAAA-MM-DD&to=AAAA-MM-DD`) |
| `GET /api/reports/excel` | Planilha .xlsx (resumo, lançamentos, categorias, saldos, patrimônio) |

## 6. Serviços do Docker Compose (produção)

| Serviço | Imagem | Função |
| --- | --- | --- |
| `db` | postgres:16-alpine | Banco; volume `pgdata`; não exposto à internet |
| `migrate` | build `migrator` | Aplica migrations + seed e encerra |
| `app` | build `runner` | Next.js standalone, usuário não-root, healthcheck |
| `nginx` | nginx:1.27-alpine | Portas 80/443, TLS, cabeçalhos de segurança, rate limit |
| `certbot` | certbot/certbot | Renova o certificado a cada 12h |
| `backup` | prodrigestivill/postgres-backup-local:16 | Dump diário 03:00 → `./backups` (7 diários, 4 semanais, 6 mensais) |

## 7. Variáveis de ambiente (`.env`)

| Variável | Uso |
| --- | --- |
| `DOMAIN`, `LETSENCRYPT_EMAIL` | Domínio e e-mail do certificado HTTPS |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Banco de dados |
| `DATABASE_URL` | Só no desenvolvimento local (no Docker é montada automaticamente) |
| `AUTH_SECRET` | Chave de assinatura das sessões (32+ caracteres) |
| `COOKIE_SECURE` | `true` em produção (HTTPS) |
| `APP_TZ` | Fuso horário (padrão America/Sao_Paulo) |
| `USER1_*`, `USER2_*` | Usuários administradores criados no primeiro deploy |
| `BACKUP_KEEP_DAYS/WEEKS/MONTHS` | Retenção dos backups |

## 8. Comandos do dia a dia

| Objetivo | Comando |
| --- | --- |
| Rodar localmente | `docker compose -f docker-compose.dev.yml up -d` e depois `npm run dev` |
| Verificar tipos | `npm run typecheck` |
| Nova migração | `npx prisma migrate dev --name descricao` |
| Ver o banco | `npx prisma studio` |
| Deploy na VPS | `./scripts/deploy.sh` |
| Backup / restauração | `./scripts/backup.sh` · `./scripts/restore.sh <arquivo>` |
