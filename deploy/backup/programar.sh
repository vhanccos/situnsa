#!/bin/sh
# Programa el respaldo diario con el crond de busybox (imagen alpine) y queda
# en primer plano. BACKUP_CRON en UTC: por defecto 07:00 = 02:00 en Arequipa.
set -eu

: "${DATABASE_URL:?Falta DATABASE_URL}"
# crond ejecuta las tareas con un entorno vacío: se les pasa solo lo necesario.
umask 077
export -p | grep -E '^export (DATABASE_URL|DOCS_DIR|BACKUP_DIR|BACKUP_RETENCION_DIAS)=' > /etc/respaldo.env
mkdir -p /etc/crontabs
echo "${BACKUP_CRON:-0 7 * * *} . /etc/respaldo.env; /bin/sh /opt/backup/respaldo.sh >> /proc/1/fd/1 2>&1" > /etc/crontabs/root
echo "Respaldo programado: ${BACKUP_CRON:-0 7 * * *} (UTC) → ${BACKUP_DIR:-/backups}"
exec crond -f -l 8
