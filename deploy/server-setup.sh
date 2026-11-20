#!/usr/bin/env bash
# One-time hardening + Docker install for a fresh Ubuntu 24.04 Timeweb server.
# Run as root:  bash server-setup.sh <your-ssh-public-key-string>
# It creates user `deploy`, allows SSH only by key, opens ports 22/80/443, adds swap and Docker.
set -euo pipefail

PUBKEY="${1:?Pass your SSH public key (the whole 'ssh-ed25519 AAAA... comment' line) in quotes}"

apt-get update && apt-get -y upgrade
apt-get -y install ufw fail2ban unattended-upgrades ca-certificates curl

# User without root
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy && chmod 440 /etc/sudoers.d/deploy

# SSH: keys only, no root login. Check you can log in as `deploy` BEFORE closing this session.
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
EOF
systemctl reload ssh

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

# 2 GB swap as a safety net for memory peaks
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Docker (official repository)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker deploy

echo "Done. Open a NEW terminal and check:  ssh deploy@<server-ip>"
