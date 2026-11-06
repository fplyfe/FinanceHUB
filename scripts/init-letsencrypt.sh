#!/usr/bin/env bash
# Emite o primeiro certificado Let's Encrypt para $DOMAIN.
# Uso: ./scripts/init-letsencrypt.sh   (STAGING=1 para testar sem limite de emissão)
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
: "${DOMAIN:?Defina DOMAIN no .env}"
: "${LETSENCRYPT_EMAIL:?Defina LETSENCRYPT_EMAIL no .env}"

CONF=./certbot/conf
LIVE="$CONF/live/$DOMAIN"
mkdir -p "$LIVE" ./certbot/www

if [ -f "$LIVE/fullchain.pem" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "Certificado já existe para $DOMAIN (use FORCE=1 para recriar)."; exit 0
fi

echo ">> Criando certificado temporário para o Nginx subir..."
docker compose run --rm --entrypoint "openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
  -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem -subj /CN=localhost" certbot

echo ">> Subindo app + nginx..."
docker compose up -d --build nginx

echo ">> Removendo certificado temporário..."
docker compose run --rm --entrypoint "rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

STAGING_ARG=""
[ "${STAGING:-0}" = "1" ] && STAGING_ARG="--staging"

echo ">> Solicitando certificado real..."
docker compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot \
  $STAGING_ARG --email $LETSENCRYPT_EMAIL -d $DOMAIN --rsa-key-size 4096 --agree-tos --no-eff-email --non-interactive" certbot

docker compose exec nginx nginx -s reload
echo ">> Pronto: https://$DOMAIN"
