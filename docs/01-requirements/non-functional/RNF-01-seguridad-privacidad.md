# RNF-01: Seguridad y Privacidad

* **ID:** RNF-01 · **Prioridad:** Alta · **HUs:** HU-0001 (autenticación), HU-0002 (gestión de usuarios), HU-0003 (roles y permisos), HU-0063/HU-0064 (historial)

## 1. Control de acceso (ABAC + CASL)
Denegación por defecto según `02-domain/permissions-matrix.md`: el backend aplica
políticas CASL (actor × rol × estado del expediente × recurso). El frontend solo
oculta; **toda** decisión de autorización se revalida en API. Reaperturas y cargas
autorizadas solo `ADMIN_SISTEMA` con motivo auditable (RN-L18).

## 2. Autenticación híbrida
* Personal: usuario + contraseña con **hash verificado** (legacy `BD13_verifyPassword_`,
  espejo `72_BD_AuthMirrorV13.js` → migrar a Argon2/bcrypt, nunca texto).
* Tesistas/invitados: portal por **DNI/CUI** con consistencia reparada (`90/91/92_BD_Login*`,
  `93_BD_PortalInvitadoRelacionalV184.js`, `94_BD_AutoPortalV188.gs.js`).
* Sesiones con expiración, bloqueo por intentos, y (fase 2) Google OAuth institucional.

## 3. Protección documental y custodia
* Documentos servidos por streaming con `X-Accel-Redirect` (Nginx), jamás como
  estáticos públicos; URLs firmadas de un solo uso y corta vida.
* Migración del Drive personal a volumen institucional con control de versiones
  (`VERSION` RN-L15) y dedup por nombre normalizado (RN-L12).
* **Cadena de custodia**: cada evento de historial incluye **hash SHA-256**
  encadenado (anterior + payload) → auditoría inviolable consultable (HU-0063/64).

## 4. Privacidad
Datos personales (DNI/CUI/teléfonos/DJ penales) cifrados en reposo (columna) y
mínimo privilegio por rol (RN-06/RN-07); DJ de información confidencial de empresas
(RN-01.3) con acceso restringido a responsables. Retención y borrado lógico
(`ELIMINADO` RN-L15) conforme a la normativa UNSA.

## Criterios de aceptación
```gherkin
Escenario: Acceso cruzado entre asesores
  Dado que un asesor autenticado pide el expediente de otro asesor
  Cuando la API evalúa la política CASL
  Entonces responde 403 y audita el intento con hash

Escenario: Verificación de cadena de custodia
  Dado el historial completo de un expediente
  Cuando se recalculan los hashes encadenados
  Entonces todos coinciden o el sistema reporta el punto de ruptura
```
