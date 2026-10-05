#!/bin/sh
# Respaldo (RNF-03): pg_dump de la BD + volumen documental, con verificación
# de legibilidad, checksums SHA-256 y retención (por defecto 30 días).
# Corre en la imagen postgres:16-alpine (pg_dump/pg_restore, tar, sha256sum).
#   DATABASE_URL           conexión a Postgres (obligatoria)
#   DOCS_DIR               volumen documental (default /docs)
#   BACKUP_DIR             destino de los respaldos (default /backups)
#   BACKUP_RETENCION_DIAS  antigüedad máxima en días (default 30)
set -eu

: "${DATABASE_URL:?Falta DATABASE_URL}"
DESTINO="${BACKUP_DIR:-/backups}"
DOCS="${DOCS_DIR:-/docs}"
RETENCION="${BACKUP_RETENCION_DIAS:-30}"
SELLO="$(date -u +%Y%m%dT%H%M%SZ)"
DB="situnsa-db-$SELLO.dump"
ARCHIVOS="situnsa-docs-$SELLO.tar.gz"

umask 077
mkdir -p "$DESTINO"
cd "$DESTINO"

# 1. Base de datos (formato custom: restauración selectiva y en paralelo).
pg_dump --format=custom --no-owner --no-privileges --file="$DB.parcial" "$DATABASE_URL"
pg_restore --list "$DB.parcial" > /dev/null # el dump es legible
mv "$DB.parcial" "$DB"

# 2. Volumen documental (PDF cargados y formatos generados).
tar -czf "$ARCHIVOS.parcial" -C "$DOCS" .
gzip -t "$ARCHIVOS.parcial"
mv "$ARCHIVOS.parcial" "$ARCHIVOS"

# 3. Checksums: restaurar.sh se niega a usar un respaldo alterado o incompleto.
sha256sum "$DB" "$ARCHIVOS" > "situnsa-$SELLO.sha256"

# 4. Retención (RPO < 24 h con un respaldo diario; 30 días de historia).
find "$DESTINO" -maxdepth 1 -type f -name 'situnsa-*' -mtime +"$RETENCION" -delete

echo "Respaldo $SELLO listo en $DESTINO: BD $(du -h "$DB" | cut -f1), documentos $(du -h "$ARCHIVOS" | cut -f1)"
