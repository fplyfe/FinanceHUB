#!/usr/bin/env bash
# Restaura um backup .sql.gz. Uso: ./scripts/restore.sh backups/daily/financehub-20261106.sql.gz
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

FILE="${1:?Informe o arquivo .sql.gz}"
[ -f "$FILE" ] || { echo "Arquivo não encontrado: $FILE"; exit 1; }

read -r -p "Isto SUBSTITUI os dados atuais por $FILE. Digite 'restaurar' para continuar: " ok
[ "$ok" = "restaurar" ] || { echo "Cancelado."; exit 1; }

docker compose stop app
gunzip -c "$FILE" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 >/dev/null
docker compose start app
echo ">> Restauração concluída."
