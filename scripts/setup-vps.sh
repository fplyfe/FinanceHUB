#!/usr/bin/env bash
# Preparação inicial de uma VPS Ubuntu 22.04/24.04 (rodar como root ou com sudo).
set -euo pipefail

echo ">> Atualizando pacotes..."
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades

echo ">> Instalando Docker + Compose plugin..."
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG docker "$SUDO_USER"
fi

echo ">> Firewall (SSH, HTTP, HTTPS)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ">> Atualizações automáticas de segurança..."
dpkg-reconfigure -f noninteractive unattended-upgrades

echo ">> Swap de 2GB (se não existir) — ajuda no build em VPS pequenas..."
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

systemctl enable --now fail2ban
echo ">> VPS pronta. Faça logout/login para usar docker sem sudo."
