#!/bin/bash
# =============================================================================
# Loomknot — Server initialization script
# Run once on a fresh Ubuntu 24.04 VPS
# Usage: ssh root@SERVER_IP 'bash -s' < deploy/server-init.sh
# =============================================================================
set -euo pipefail

echo "=== Loomknot Server Init ==="

# --- System updates ---
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git ufw fail2ban jq

# --- Firewall ---
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# --- fail2ban ---
systemctl enable fail2ban
systemctl start fail2ban

# --- Unattended upgrades ---
apt-get install -y unattended-upgrades
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades

# --- Docker ---
curl -fsSL https://get.docker.com | sh

# --- Docker Swarm init ---
PRIVATE_IP=$(hostname -I | awk '{print $1}')
docker swarm init --advertise-addr "${PRIVATE_IP}"
echo "Swarm initialized on ${PRIVATE_IP}"

# --- Create overlay networks (attachable for Compose ↔ Swarm) ---
docker network create --driver overlay --attachable traefik-public
docker network create --driver overlay --attachable loomknot-internal
echo "Networks created: traefik-public, loomknot-internal"

# --- Directory structure ---
mkdir -p /opt/traefik/dynamic
mkdir -p /opt/apps/loomknot
mkdir -p /opt/backups/postgres

# --- Traefik acme.json ---
touch /opt/traefik/acme.json
chmod 600 /opt/traefik/acme.json

# --- Login to GitHub Container Registry ---
echo "=== GHCR Login ==="
echo "Run manually: echo GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"

echo ""
echo "=== Server init complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy traefik configs:  scp deploy/traefik/traefik.yml SERVER:/opt/traefik/"
echo "  2. Copy traefik dynamic:  scp deploy/traefik/dynamic/* SERVER:/opt/traefik/dynamic/"
echo "  3. Copy traefik compose:  scp deploy/traefik/docker-compose.yml SERVER:/opt/traefik/"
echo "  4. Deploy Traefik:        ssh SERVER 'docker stack deploy -c /opt/traefik/docker-compose.yml traefik'"
echo "  5. Copy .env files:       scp deploy/env-templates/.env.* SERVER:/opt/apps/loomknot/"
echo "  6. Edit .env files:       ssh SERVER 'nano /opt/apps/loomknot/.env.infra'"
echo "  7. Start infra:           ssh SERVER 'cd /opt/apps/loomknot && docker compose -f docker-compose.infra.yml --env-file .env.infra up -d'"
echo "  8. First deploy:          Push to main → GitHub Actions"
