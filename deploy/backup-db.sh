#!/usr/bin/env bash
# Daily Postgres dump, keeps the last 7. Run from the folder with docker-compose.yml.
# Cron (as user deploy):  0 3 * * *  cd ~/polutone && bash deploy/backup-db.sh
set -euo pipefail
mkdir -p backups
docker compose exec -T db pg_dump -U polutone polutone | gzip > "backups/polutone-$(date +%F).sql.gz"
ls -1t backups/polutone-*.sql.gz | tail -n +8 | xargs -r rm --
