#!/bin/bash
set -e

DOMAIN="foodmemories.vps.tecnico.ulisboa.pt"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SSL_DIR="$PROJECT_DIR/ssl"

echo "=== Stopping Docker containers to free port 80 ==="
cd "$PROJECT_DIR"
docker compose down

echo "=== Renewing Let's Encrypt certificate ==="
sudo certbot renew

echo "=== Copying renewed certificates ==="
mkdir -p "$SSL_DIR"
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
sudo chmod 644 "$SSL_DIR/fullchain.pem" "$SSL_DIR/privkey.pem"

echo "=== Restarting Docker stack ==="
docker compose up -d --build

echo "=== Renewal complete ==="

