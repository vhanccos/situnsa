# RNF-03: Disponibilidad y Respaldo

* **ID:** RNF-03 · **Prioridad:** Alta · **HUs:** transversales (historial, documentos)

## 1. Objetivos
* **RTO < 1 hora, RPO < 24 horas.**
* Respaldo diario automatizado: `pg_dump` + snapshot comprimido del volumen
  documental, con **retención de 30 días** y verificación de restauración.
* Disponibilidad objetivo del trámite en horario administrativo; degradación
  elegante (cola de notificaciones y jobs reintentables).

## 2. Estrategia
* Backups programados con checksum y prueba de restore periódica documentada;
  runbook de recuperación (DB + volumen + re-emisión de URLs firmadas).
* Borrado lógico en lugar de físico (RN-L15; `86_BD_EliminarExpedienteV176.js`) →
  recuperación de eliminaciones por ADMIN dentro de la retención.
* Historial y documentos como fuente de reconstrucción cronológica del trámite
  (Taller §15) → cualquier expediente es re-auditable post-restore.
* Migración Drive personal → almacenamiento institucional versionado (RN-L12/L13)
  incluida en el plan de corte (`75_BD_CutoverControllerV14.js` como referencia).

## Criterios de aceptación
```gherkin
Escenario: Recuperación ante fallo total
  Dado el backup del día anterior verificado
  Cuando se ejecuta el runbook de restauración
  Entonces el sistema opera en menos de 1 hora con pérdida máxima de 24 horas
  Y la cadena de hashes de historiales se verifica íntegra
```
