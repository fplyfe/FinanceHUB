# Plano de implantação — FinanceHub em VPS Ubuntu

## 0. Requisitos

- VPS Ubuntu 22.04 ou 24.04, **1 vCPU / 1–2 GB RAM** é suficiente (o script cria 2 GB de swap para o build).
- Domínio (ou subdomínio) com registro **A** apontando para o IP da VPS, ex.: `financeiro.seudominio.com`.
- Acesso SSH com chave (recomendado desabilitar login por senha em `/etc/ssh/sshd_config`).

## 1. Preparar a VPS

```bash
ssh usuario@IP_DA_VPS
sudo apt-get update && sudo apt-get install -y git
git clone <URL_DO_REPOSITORIO> ~/financehub
cd ~/financehub
chmod +x scripts/*.sh
sudo ./scripts/setup-vps.sh
exit   # reconecte para o grupo docker valer
```

O script instala Docker + Compose, configura o UFW (22, 80, 443), fail2ban, atualizações automáticas e swap.

## 2. Configurar variáveis

```bash
cd ~/financehub
cp .env.example .env
openssl rand -base64 48   # use como AUTH_SECRET
openssl rand -base64 24   # use como POSTGRES_PASSWORD
nano .env
chmod 600 .env
```

Preencha: `DOMAIN`, `LETSENCRYPT_EMAIL`, `POSTGRES_PASSWORD`, `AUTH_SECRET`, `COOKIE_SECURE=true`,
`USER1_*` e `USER2_*` (os dois usuários). `DATABASE_URL` do `.env` **não** é usado no Docker (o compose monta a URL apontando para `db`).

## 3. Certificado HTTPS e primeira subida

```bash
STAGING=1 ./scripts/init-letsencrypt.sh   # opcional: teste com o ambiente de staging
FORCE=1 ./scripts/init-letsencrypt.sh     # certificado real
docker compose up -d
docker compose ps
```

Sequência que o compose executa: `db` (healthy) → `migrate` (migrations + seed, encerra) → `app` → `nginx`.
Também sobem `certbot` (renova a cada 12h) e `backup` (dump diário às 03:00).

Acesse `https://SEU_DOMINIO` e entre com USER1 ou USER2. **Troque as senhas** em Configurações após o primeiro login
e, se quiser, remova `USER*_PASSWORD` do `.env` (o seed nunca sobrescreve usuários existentes).
Os dois usuários iniciais são administradores; novos usuários são cadastrados pela tela **Usuários**.

## 4. Verificação

```bash
curl -fsS https://SEU_DOMINIO/api/health        # {"status":"ok"}
docker compose logs -f app                       # logs da aplicação
docker compose logs backup | tail                # confirma o agendamento do backup
```

Checklist: login funciona · cadeado HTTPS válido · `http://` redireciona para `https://` · porta 5432 **não** acessível de fora (`nc -zv IP 5432` deve falhar).

## 5. Backups

- **Automático:** serviço `backup` grava em `./backups/{daily,weekly,monthly}/` com retenção 7/4/6 (ajuste `BACKUP_KEEP_*`).
- **Manual:** `./scripts/backup.sh` → `backups/manual/`.
- **Fora da VPS (recomendado):** instale o rclone (`sudo apt install rclone && rclone config`), defina `RCLONE_REMOTE=meudrive:financehub` no `.env` e agende:

  ```bash
  crontab -e
  30 3 * * * cd ~/financehub && ./scripts/backup.sh >> backups/cron.log 2>&1
  ```

- **Restaurar:** `./scripts/restore.sh backups/daily/<arquivo>.sql.gz` (pede confirmação, para o app durante a restauração).
- Teste uma restauração pelo menos uma vez.

## 6. Atualizações

```bash
cd ~/financehub
./scripts/deploy.sh    # backup → git pull → build → migrations → restart
```

Para mudanças no banco, crie a migration localmente (`npx prisma migrate dev --name descricao`), commite a pasta `prisma/migrations` e rode o deploy: o serviço `migrate` aplica automaticamente.

## 7. Operação

| Tarefa | Comando |
| --- | --- |
| Status | `docker compose ps` |
| Logs | `docker compose logs -f app nginx` |
| Reiniciar app | `docker compose restart app` |
| Console do banco | `docker compose exec db psql -U financehub financehub` |
| Renovar certificado já | `docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload` |
| Espaço em disco | `docker system df` / `docker image prune -f` |

## 8. Segurança aplicada

- Banco apenas na rede interna do Docker; app só exposto via Nginx.
- TLS 1.2/1.3, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`.
- Rate limit: login 5 req/min por IP (Nginx) + bloqueio após 8 falhas/15 min (app); geral 20 req/s.
- Senhas com bcrypt (custo 12); sessão JWT em cookie `httpOnly`, `secure`, `SameSite=Lax`, 30 dias.
- Contêiner da aplicação roda como usuário não-root; `robots: noindex`.
