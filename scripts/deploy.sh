#!/usr/bin/env bash
# Atualiza a aplicação na VPS: git pull + rebuild + restart sem derrubar o banco.
set -euo pipefail
cd "$(dirname "$0")/.."

echo ">> Backup antes do deploy..."
./scripts/backup.sh || echo "!! Backup falhou (continuando)"

echo ">> Atualizando código..."
git pull --ff-only

echo ">> Build das imagens..."
docker compose build migrate app

echo ">> Migrations + restart..."
docker compose up -d --remove-orphans

echo ">> Limpando imagens antigas..."
docker image prune -f >/dev/null

docker compose ps
echo ">> Deploy concluído."
