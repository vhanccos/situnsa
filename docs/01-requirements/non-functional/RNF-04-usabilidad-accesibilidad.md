# RNF-04: Usabilidad y Accesibilidad

* **ID:** RNF-04 · **Prioridad:** Alta · **HUs:** HU-0056–HU-0062 (portal, notificaciones), HU-0059 (interfaz simplificada)

## 1. Principio rector
Público con **baja alfabetización digital** (egresados de hace 5–20 años; "lo miran y
se quedan en shock" — entrevista Magnolia) que debe superar a UNSA Gradúa-T en
simplicidad. El sistema guía; el usuario solo "pone dos, tres cosas".

## 2. Requisitos
* **Wizard/stepper por trámite**: un paso = una subetapa activa; lenguaje claro,
  sin jerga; muestra solo documentos de la subetapa activa (RN-06); adjuntos con
  nombre/fecha/responsable, validación previa de formato/tamaño, progreso visible y
  distinción reemplazar ≠ eliminar (`INTERFACES (1)_1.pdf`).
* **Semáforos de alta legibilidad** (verde/ámbar/rojo + texto, nunca solo color) en
  plazos, documentos pendientes y pensiones (`calendar-rules.md` RN-PLZ-07).
* **Notificación multicanal**: correo con enlace directo al portal (Taller §27;
  CU-120/CU-062) **+ WhatsApp** para hitos (el correo no se lee — entrevista);
  plantilla con expediente, acción, nuevo estado y enlace.
* **Portales diferenciados**: tesista (su expediente, avance, pagos), asesor (solo
  asignados, bandeja de revisión + Visto Bueno en 1 clic), administrativo
  (dashboard: SET, tesista, DNI, programa, etapa, subetapa, estado, avance,
  última actualización — demo Carlos).
* **WCAG 2.1 AA**: contraste, foco visible, navegación por teclado, etiquetas en
  formularios, mensajes de error específicos sin revelar datos sensibles
  (credenciales inválidas sin distinguir causa — `INTERFACES (1)_1.pdf` §15, §19).

## Criterios de aceptación
```gherkin
Escenario: Tesista mayor completa su carga sin ayuda
  Dado un tesista sin experiencia digital en la subetapa activa
  Cuando abre su portal desde el enlace del correo
  Entonces ve un único paso con instrucciones y solo sus documentos requeridos
  Y puede cargar, ver su estado de revisión y corregir observados sin asistencia

Escenario: Accesibilidad del semáforo
  Dado un usuario con daltonismo
  Cuando consulta plazos y pendientes
  Entonces cada estado combina color, icono y texto legible por lector de pantalla
```
