# RNF-02: Rendimiento y Recursos

* **ID:** RNF-02 · **Prioridad:** Media · **HUs:** HU-0060, dashboard/consultas masivas

## 1. Objetivos medibles
* **Memoria en reposo < 350 MB** en VPS (API + workers; excluye Nginx/Postgres).
* **Estáticos vía Nginx con latencia p95 < 50 ms** en red institucional.
* API: p95 < 300 ms en consultas de expediente/listados (200 consultas/día pico
  estimado — entrevista Carlos: ~2 promociones × ~5 especialidades × ~20–25 alumnos).
* Subidas de borrador con progreso y streaming **directo a disco** (sin buffer
  completo en memoria), límite y validación de formato/tamaño antes de aceptar.

## 2. Estrategia
* Índices Postgres sobre `CODIGO_TRAMITE`, `DNI/CUI`, `(ID_EXPEDIENTE, ID_ETAPA/SUBETAPA)`,
  estados y fechas (migración del esquema `40/42_BD_*` — RN-L15/RN-L06).
* Paginación y filtros servidor-side en listados masivos
  (`obtenerSeguimientoSubetapasMasivo` legacy → endpoint paginado).
* Consultas de avance/estado precalculadas (`PORCENTAJE`, `calcularPorcentajeSubetapas`)
  con invalidación por evento, no por polling.
* Jobs (reiteraciones, vencimientos, notificaciones) en worker fuera del request-path.

## Criterios de aceptación
```gherkin
Escenario: Listado masivo de expedientes
  Dado 2000 expedientes con seguimiento completo
  Cuando se consulta el dashboard con filtros
  Entonces el p95 es menor a 300 ms y la memoria en reposo no supera 350 MB
```
