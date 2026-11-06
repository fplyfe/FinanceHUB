#!/usr/bin/env bash
# Backup manual (o automático diário roda no serviço "backup" do compose).
# Se RCLONE_REMOTE estiver definido (ex.: "gdrive:financehub"), envia a pasta backups/ para fora da VPS.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

mkdir -p backups/manual
FILE="backups/manual/financehub-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$FILE"
echo ">> Backup salvo em $FILE"

# Mantém apenas os 20 backups manuais mais recentes
ls -1t backups/manual/*.sql.gz 2>/dev/null | tail -n +21 | xargs -r rm -f

if [ -n "${RCLONE_REMOTE:-}" ] && command -v rclone >/dev/null; then
  rclone sync backups "$RCLONE_REMOTE" --quiet && echo ">> Sincronizado com $RCLONE_REMOTE"
fi
