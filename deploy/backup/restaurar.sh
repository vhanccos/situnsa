#!/bin/sh
# Restauración (runbook RNF-03): verifica los checksums, restaura la BD y
# reemplaza el volumen documental. Antes guarda una copia de los documentos
# actuales, de modo que la restauración también puede deshacerse.
# Uso: restaurar.sh <SELLO>   (p. ej. 20261005T070000Z; ver BACKUP_DIR)
# Detener la API antes (make restore lo hace) y, al terminar, verificar la
# cadena de custodia: node apps/api/dist/scripts/verificar-auditoria.js
set -eu

SELLO="${1:?Uso: restaurar.sh <SELLO> (p. ej. 20261005T070000Z)}"
: "${DATABASE_URL:?Falta DATABASE_URL}"
DESTINO="${BACKUP_DIR:-/backups}"
DOCS="${DOCS_DIR:-/docs}"
DB="situnsa-db-$SELLO.dump"
ARCHIVOS="situnsa-docs-$SELLO.tar.gz"

cd "$DESTINO"
sha256sum -c "situnsa-$SELLO.sha256"

# 1. Base de datos: todo o nada. Se reconstruyen los esquemas del respaldo
#    (no `pg_restore --clean`, que falla con las tablas particionadas de
#    pg-boss) dentro de una sola transacción: ante cualquier error, nada cambia.
#    El SQL se genera completo antes de aplicarlo: un pg_restore interrumpido
#    nunca llega a psql (que confirmaría un script truncado).
umask 077
SQL="$DESTINO/.restauracion-$SELLO.sql"
trap 'rm -f "$SQL"' EXIT
ESQUEMAS="$(pg_restore --list "$DB" | awk '$4 == "SCHEMA" && $5 == "-" { print $6 }')"
{
  for esquema in $ESQUEMAS public; do
    printf 'DROP SCHEMA IF EXISTS "%s" CASCADE;\n' "$esquema"
  done
  echo 'CREATE SCHEMA public;'
} > "$SQL"
pg_restore --no-owner --no-privileges --file=- "$DB" >> "$SQL"
PGOPTIONS="-c client_min_messages=warning" \
  psql --single-transaction --set=ON_ERROR_STOP=1 --quiet --dbname="$DATABASE_URL" \
  --file="$SQL" > /dev/null

# 2. Documentos: copia de lo actual y reemplazo por el respaldo.
PREVIO="situnsa-docs-previo-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -czf "$PREVIO" -C "$DOCS" .
find "$DOCS" -mindepth 1 -delete
tar -xzf "$ARCHIVOS" -C "$DOCS"

echo "Restaurado el respaldo $SELLO (documentos anteriores en $DESTINO/$PREVIO)."
echo "Siguiente paso: verificar la cadena de custodia (verificar-auditoria)."
