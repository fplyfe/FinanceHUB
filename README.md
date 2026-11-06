# FinanceHub

Controle financeiro pessoal compartilhado (ex.: casal ou família), auto-hospedado em VPS com Docker Compose.

**Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · componentes no padrão shadcn/ui · PostgreSQL 16 · Prisma 6 · Nginx + Let's Encrypt.

## Funcionalidades

| Módulo | O que faz |
| --- | --- |
| Dashboard | Saldo total, receitas/despesas do mês, faturas abertas, gráfico de 6 meses, despesas por categoria, próximos vencimentos, metas |
| Lançamentos | Receitas e despesas com filtros (mês, tipo, status, conta, categoria, busca), marcar pago/pendente, editar, excluir |
| Contas | Corrente, poupança, dinheiro, investimentos, carteira digital; saldo calculado em tempo real |
| Cartões | Limite usado/disponível, faturas por fechamento, vencimento, pagamento da fatura debitando uma conta |
| Transferências | Entre contas (não contam como receita/despesa) |
| Parcelamentos | Gera N parcelas mensais (no cartão ou na conta), centavos distribuídos corretamente |
| Recorrentes | Semanal/mensal/anual, com data de término, débito automático opcional; geradas automaticamente ao abrir o app |
| Investimentos | Carteira por tipo (renda fixa, ações, FIIs, fundos, cripto, previdência, exterior), aportes/resgates ligados às contas, atualização do valor de mercado, rentabilidade por custo médio, alocação |
| Patrimônio | Balanço patrimonial: ativos (contas + investimentos) − passivos (cartões + contas negativas), evolução mensal de 12 meses |
| Metas | Valor alvo, prazo, aportes e resgates, sugestão de valor mensal |
| Relatórios | Por período, por categoria; exportação **PDF** e **Excel** (.xlsx com 4 abas) |
| Usuários | Cadastro, edição, perfis (Administrador/Membro), desativação sem perder histórico, redefinição de senha, último acesso |
| Configurações | Categorias, meu perfil (nome/e-mail), troca de senha |
| Backups | Dump diário automático do PostgreSQL com retenção (7 diários, 4 semanais, 6 mensais) + scripts de backup/restore |

## Arquitetura

```
Internet ──► Nginx (80/443, TLS, rate limit) ──► app (Next.js standalone :3000) ──► db (PostgreSQL, rede interna)
                                    certbot (renovação)          backup (pg_dump diário → ./backups)
```

- **Server Components** leem o banco diretamente (rápido, sem camada extra).
- **Mutations** via API REST em `src/app/api/**` (validadas com Zod), chamadas pelos componentes cliente.
- **Autenticação:** e-mail + senha (bcrypt), sessão em JWT assinado (HS256) em cookie `httpOnly`, validada no banco a cada requisição (usuário desativado ou senha redefinida perde o acesso na hora); middleware protege todas as rotas; limite de tentativas no app e no Nginx.
- **Perfis:** Administrador gerencia usuários; Membro usa o app normalmente. Sempre resta ao menos um administrador ativo.
- **Regras de dinheiro:** valores em `Decimal(14,2)`; datas como `DATE` (sem fuso) para evitar deslocamentos.
- **Investimentos:** movimentações (aporte/resgate/atualização de valor); aporte com conta debita o saldo, resgate credita. Lucro calculado por custo médio.
- **Cartão:** compras ficam `PENDING` na fatura (afetam o limite, não o saldo); ao pagar a fatura viram `PAID` na conta escolhida.

### Estrutura de pastas

> Mapa completo (cada arquivo, modelo de dados, telas e todos os endpoints): **[docs/ESTRUTURA.md](docs/ESTRUTURA.md)**

```
prisma/                 schema.prisma, migrations/, seed.ts
src/
  middleware.ts         proteção de rotas
  app/
    login/              tela de login
    (app)/              área autenticada: dashboard, transactions, accounts, cards,
                        transfers, installments, recurring, investments, net-worth, goals, reports, settings
    api/                auth, accounts, cards (+invoices, pay), categories, transactions,
                        transfers, installments, recurring (+run), goals (+contribute),
                        reports (pdf, excel), investments (+entries), investment-entries, net-worth, health
  components/ui/        button, card, input/select, dialog, badge/progress (padrão shadcn)
  components/app/       sidebar, form-dialog, month-nav, gráficos
  lib/                  db, auth, api (handler), validators (zod), finance (regras),
                        queries, reports, dates, utils
nginx/templates/        config do Nginx (envsubst com ${DOMAIN})
scripts/                setup-vps, init-letsencrypt, deploy, backup, restore
docs/DEPLOY.md          plano de implantação passo a passo
```

## Rodar localmente

Pré-requisitos: Node 20+ e Docker.

```bash
npm install
docker compose -f docker-compose.dev.yml up -d   # Postgres em localhost:5433
cp .env.example .env                              # ajuste DATABASE_URL para a porta 5433 (usuário financehub / senha dev)
npx prisma migrate deploy
npm run db:seed                                   # cria USER1/USER2 e categorias
npm run dev                                       # http://localhost:3000
```

> No `.env` local use `COOKIE_SECURE=false` (sem HTTPS) e um `AUTH_SECRET` com 32+ caracteres.

Comandos úteis: `npm run typecheck`, `npm run build`, `npx prisma studio`, `npx prisma migrate dev --name <nome>` (nova migration).

## Produção

Veja **[docs/DEPLOY.md](docs/DEPLOY.md)**. Resumo:

```bash
sudo ./scripts/setup-vps.sh        # Docker, firewall, fail2ban, swap
cp .env.example .env && nano .env  # domínio, senhas, AUTH_SECRET, usuários
./scripts/init-letsencrypt.sh      # certificado HTTPS + sobe tudo
docker compose up -d
```
