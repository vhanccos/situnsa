# Respaldo y restauración (RNF-03)

Objetivos: **RPO < 24 h** (un respaldo diario) y **RTO < 1 h** (restauración
guiada por este runbook), con **30 días de retención** y verificación de la
cadena de custodia tras cada restauración.

## Qué se respalda

| Pieza | Cómo | Archivo |
|---|---|---|
| Base de datos completa (incluye `drizzle.__drizzle_migrations`) | `pg_dump --format=custom` + `pg_restore --list` (legible) | `situnsa-db-<SELLO>.dump` |
| Volumen documental (PDF cargados y formatos generados) | `tar -czf` + `gzip -t` | `situnsa-docs-<SELLO>.tar.gz` |
| Integridad de ambos | `sha256sum` | `situnsa-<SELLO>.sha256` |

`<SELLO>` es la hora UTC del respaldo (`20261005T070000Z`). Los scripts viven
en `deploy/backup/` y corren en la imagen `postgres:16-alpine`; los respaldos
quedan en `deploy/backups/` (ignorado por git: contiene datos personales).

## Respaldo

- **Programado** (despliegue con `deploy/docker-compose.prod.yml`):

  ```bash
  docker compose -f deploy/docker-compose.prod.yml --profile backup up -d backup
  ```

  Corre todos los días a las 07:00 UTC (02:00 en Arequipa). Ajustable con
  `BACKUP_CRON` (sintaxis cron, en UTC) y `BACKUP_RETENCION_DIAS` (default 30).
  La salida de cada respaldo aparece en `docker compose logs backup`.
- **Inmediato** (antes de una migración o un cambio riesgoso): `make backup`.
- **Fuera del servidor**: copiar `deploy/backups/` a un almacenamiento
  institucional distinto del disco del servidor (un respaldo en el mismo disco
  no protege ante la pérdida del disco).

## Restauración (runbook)

1. Elegir el respaldo: `ls deploy/backups/` (el `.sha256` lista ambos archivos).
2. Restaurar: `make restore SELLO=<SELLO>`. El objetivo:
   1. detiene la API (`web`) para que no haya escrituras en curso;
   2. verifica los checksums (se niega a usar un respaldo alterado o incompleto);
   3. restaura la base en **una sola transacción** (todo o nada): elimina y
      recrea los esquemas del respaldo (`public`, `drizzle`, `pgboss`) y aplica
      el SQL ya generado completo. No se usa `pg_restore --clean`, que falla
      con las tablas particionadas de pg-boss;
   4. guarda una copia de los documentos actuales
      (`situnsa-docs-previo-<hora>.tar.gz`) y los reemplaza por los del respaldo;
   5. arranca la API y ejecuta `verificar-auditoria`.
3. Verificar que `verificar-auditoria` responda «Cadena de custodia íntegra»
   (código de salida 0). Si informa una cadena rota (código 1), el respaldo
   no es confiable: restaurar el anterior y escalar a seguridad.
4. Comprobar `GET /api/health` y abrir un expediente con documentos.

La restauración de la base es reversible restaurando otro respaldo; la de los
documentos, con el `situnsa-docs-previo-*.tar.gz` que deja el paso 2.4.

En Windows con Git Bash, anteponer `MSYS_NO_PATHCONV=1` a los comandos de
`docker compose … run` (Git Bash reescribe `/bin/sh` como ruta de Windows);
en Linux, WSL o PowerShell no hace falta.

Prueba realizada (2026-10-05, `prod-local`): respaldo → carga de un documento
→ restauración → la base y el volumen vuelven al respaldo (18 → 17 eventos,
7 → 6 archivos) y `verificar-auditoria` informa la cadena íntegra.

## Verificación de la cadena de custodia

`verificar-auditoria` recorre la cadena SHA-256 de cada expediente desde
GENESIS siguiendo los enlaces y recalcula cada hash (`verificarCadena`,
`packages/domain/src/audit/cryptographic-trail.ts`). Detecta eventos
alterados, bifurcaciones y eventos que no enlazan.

```bash
pnpm --filter @pis/api verificar-auditoria              # desarrollo
node apps/api/dist/scripts/verificar-auditoria.js       # contenedor de producción
```

## Render

El plan gratuito no ofrece disco persistente ni respaldos de Postgres: los PDF
se pierden en cada redeploy y la base no tiene copia. Para uso real se necesita
un plan con **Persistent Disk** montado en `/var/data/titulacion-docs` y la
base con respaldos administrados (recuperación a un punto en el tiempo), o el
despliegue con `docker-compose.prod.yml` y el servicio `backup` de este runbook.
Probar la restauración al menos una vez por trimestre y registrar el resultado.
