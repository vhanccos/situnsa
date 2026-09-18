La reunión aborda el levantamiento de información sobre el proceso administrativo de titulación en el programa de Segunda Especialidad de la UNSA y la planificación del desarrollo de un nuevo sistema informático para automatizarlo.

**Proceso de Titulación y Flujo Administrativo**

* **Modalidades y requisitos:** Consta de tesis, trabajo académico (acreditando 2 años de experiencia laboral validada con reporte institucional) y artículo científico publicado en revista indexada.


* **Etapa 1 (Plan):** El tesista registra su plan con un asesor obligatorio y presenta 5 documentos. Una terna evaluadora (director, asesor y un docente afín) dispone de 5 días hábiles para emitir observaciones antes de su aprobación mediante decreto.


* **Etapa 2 (Borrador y Sustentación):** Con la conformidad del asesor, se sortea un jurado dictaminador (15 días hábiles para revisión). Tras el dictamen, se programa la sustentación pública y se emite el veredicto (unanimidad, mayoría, felicitación o desaprobación).


* **Cierre y colación:** El expediente pasa por revisión de similitud en Turnitin (< 20%), registro en Repositorio Institucional, aprobación en Consejo de Facultad y carga final en SISGRAD.


* **Dificultades identificadas:** Incompatibilidad con UNSA Gradúate por la brecha digital de alumnos egresados hace años, errores manuales constantes en carátulas/tildes y cuellos de botella al coordinar agendas docentes para sustentaciones.



**Estado Técnico del Prototipo Actual**

* **Implementación base:** Carlos desarrolló un piloto funcional utilizando scripts de Google conectados a Google Drive y formularios que completan plantillas documentales con etiquetas.


* **Estructura funcional:** El flujo abarca 7 etapas con subetapas secuenciales, historial de auditoría y soporte para expedientes individuales o en pareja.


* **Canales de entrada:** Registra solicitudes regulares y alumnos provenientes de los cursos de Taller de Tesis tras la validación de sus inscripciones.


* **Gestión de roles:** Permite asignar y derivar responsabilidades específicas según la subetapa entre los distintos colaboradores administrativos.



**Acuerdos con el Equipo de Desarrollo**

* **Prioridad del alcance:** El equipo de estudiantes priorizará la culminación y optimización del módulo de trámites de titulación antes de abordar el portal académico.


* **Infraestructura:** Evaluar la migración a PostgreSQL y definir requerimientos técnicos de RAM/almacenamiento para solicitar un servidor a OTI o contratar un VPS.


* **Entregables inmediatos:** Carlos compartirá el código y documentación del prototipo para que el equipo elabore el cronograma, historias de usuario y propuestas de mejora en la interfaz.
