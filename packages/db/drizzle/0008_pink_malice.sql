CREATE TABLE "documentos_generados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"tipo" varchar(64) NOT NULL,
	"etapa" varchar(8) NOT NULL,
	"ruta" text NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"version_plantilla" varchar(16) NOT NULL,
	"pendientes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documentos_generados_expediente_tipo" UNIQUE("expediente_id","tipo")
);
--> statement-breakpoint
CREATE TABLE "tokens_acceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"hash" varchar(64) NOT NULL,
	"proposito" varchar(16) DEFAULT 'ACTIVACION' NOT NULL,
	"expira_at" timestamp with time zone NOT NULL,
	"usado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_acceso_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
ALTER TABLE "catalogo_docs_requeridos" ADD COLUMN "requerido_en" varchar(40);--> statement-breakpoint
ALTER TABLE "catalogo_subetapas" ADD COLUMN "clave" varchar(40);--> statement-breakpoint
ALTER TABLE "jurados_expediente" ADD COLUMN "instancia" varchar(8) DEFAULT 'JURADO' NOT NULL;--> statement-breakpoint
ALTER TABLE "validaciones_institucionales" ADD COLUMN "porcentaje" integer;--> statement-breakpoint
ALTER TABLE "subetapas" ADD COLUMN "clave" varchar(40);--> statement-breakpoint
ALTER TABLE "subetapas" ADD COLUMN "alertada_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documentos_generados" ADD CONSTRAINT "documentos_generados_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens_acceso" ADD CONSTRAINT "tokens_acceso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Backfill (datos): claves estables de subetapa en expedientes y catálogo existentes.
UPDATE "subetapas" s SET "clave" = m.clave FROM (VALUES (1, 1, 'E1_PRESENTACION_PLAN'), (1, 2, 'E1_VALIDACION_DOCUMENTOS'), (1, 3, 'E1_ASIGNACION_TERNA'), (1, 4, 'E1_REVISION_TERNA'), (1, 5, 'E1_LEVANTAMIENTO'), (1, 6, 'E1_DECRETO'), (2, 1, 'E2_CARGA_DOCUMENTOS'), (2, 2, 'E2_REVISION_DOCUMENTAL'), (2, 3, 'E2_VALIDACION_EXPEDIENTE'), (3, 1, 'E3_RECEPCION'), (3, 2, 'E3_SORTEO_JURADOS'), (3, 3, 'E3_REVISION_JURADOS'), (3, 4, 'E3_OBSERVACIONES'), (3, 5, 'E3_LEVANTAMIENTO'), (3, 6, 'E3_CONFORMIDAD_FINAL'), (4, 1, 'E4_PROPUESTA_FECHAS'), (4, 2, 'E4_COORDINACION_JURADOS'), (4, 3, 'E4_PUBLICACION'), (4, 4, 'E4_VERSION_FINAL'), (4, 5, 'E4_SUSTENTACION'), (5, 1, 'E5_TURNITIN'), (5, 2, 'E5_REVISION_SIMILITUD'), (5, 3, 'E5_INFORME_SIMILITUD'), (5, 4, 'E5_FIRMA_INFORME'), (5, 5, 'E5_REPOSITORIO'), (5, 6, 'E5_URL_REPOSITORIO'), (6, 1, 'E6_SECRETARIA'), (6, 2, 'E6_COMISION'), (6, 3, 'E6_CONSEJO_FACULTAD'), (6, 4, 'E6_RESOLUCION'), (6, 5, 'E6_SISGRAD'), (6, 6, 'E6_VALIDACION_DATOS'), (6, 7, 'E6_FIRMA_DECANO'), (6, 8, 'E6_GRADOS_TITULOS'), (6, 9, 'E6_CONSEJO_UNIVERSITARIO'), (7, 1, 'E7_COLACION'), (7, 2, 'E7_EMISION_TITULO'), (7, 3, 'E7_SUNEDU')) AS m(etapa, orden, clave) WHERE s."clave" IS NULL AND s."etapa" = m.etapa AND s."orden" = m.orden;
--> statement-breakpoint
UPDATE "catalogo_subetapas" c SET "clave" = m.clave FROM (VALUES (1, 1, 'E1_PRESENTACION_PLAN'), (1, 2, 'E1_VALIDACION_DOCUMENTOS'), (1, 3, 'E1_ASIGNACION_TERNA'), (1, 4, 'E1_REVISION_TERNA'), (1, 5, 'E1_LEVANTAMIENTO'), (1, 6, 'E1_DECRETO'), (2, 1, 'E2_CARGA_DOCUMENTOS'), (2, 2, 'E2_REVISION_DOCUMENTAL'), (2, 3, 'E2_VALIDACION_EXPEDIENTE'), (3, 1, 'E3_RECEPCION'), (3, 2, 'E3_SORTEO_JURADOS'), (3, 3, 'E3_REVISION_JURADOS'), (3, 4, 'E3_OBSERVACIONES'), (3, 5, 'E3_LEVANTAMIENTO'), (3, 6, 'E3_CONFORMIDAD_FINAL'), (4, 1, 'E4_PROPUESTA_FECHAS'), (4, 2, 'E4_COORDINACION_JURADOS'), (4, 3, 'E4_PUBLICACION'), (4, 4, 'E4_VERSION_FINAL'), (4, 5, 'E4_SUSTENTACION'), (5, 1, 'E5_TURNITIN'), (5, 2, 'E5_REVISION_SIMILITUD'), (5, 3, 'E5_INFORME_SIMILITUD'), (5, 4, 'E5_FIRMA_INFORME'), (5, 5, 'E5_REPOSITORIO'), (5, 6, 'E5_URL_REPOSITORIO'), (6, 1, 'E6_SECRETARIA'), (6, 2, 'E6_COMISION'), (6, 3, 'E6_CONSEJO_FACULTAD'), (6, 4, 'E6_RESOLUCION'), (6, 5, 'E6_SISGRAD'), (6, 6, 'E6_VALIDACION_DATOS'), (6, 7, 'E6_FIRMA_DECANO'), (6, 8, 'E6_GRADOS_TITULOS'), (6, 9, 'E6_CONSEJO_UNIVERSITARIO'), (7, 1, 'E7_COLACION'), (7, 2, 'E7_EMISION_TITULO'), (7, 3, 'E7_SUNEDU')) AS m(etapa, orden, clave) WHERE c."clave" IS NULL AND c."etapa_numero" = m.etapa AND c."orden" = m.orden;
--> statement-breakpoint
UPDATE "catalogo_docs_requeridos" c SET "requerido_en" = m.clave FROM (VALUES ('SOLICITUD_INSCRIPCION', 'E1_PRESENTACION_PLAN'), ('ACEPTACION_ASESORIA', 'E1_PRESENTACION_PLAN'), ('PLAN_ESTRUCTURADO', 'E1_PRESENTACION_PLAN'), ('DJ_CONFIDENCIALIDAD', 'E1_PRESENTACION_PLAN'), ('ANEXO_17', 'E1_PRESENTACION_PLAN'), ('ANEXO_18', 'E1_PRESENTACION_PLAN'), ('ANEXO_33', 'E1_PRESENTACION_PLAN'), ('ACTA_CONFORMIDAD', 'E2_CARGA_DOCUMENTOS'), ('ACTA_DICTAMEN', 'E3_CONFORMIDAD_FINAL'), ('ACTA_SUSTENTACION', 'E4_SUSTENTACION'), ('ANEXO_27', 'E2_CARGA_DOCUMENTOS'), ('ANEXO_01_DJ', 'E2_CARGA_DOCUMENTOS'), ('ANEXO_32_VERACIDAD', 'E2_CARGA_DOCUMENTOS'), ('AUTORIZACION_IMPRESION', 'E4_VERSION_FINAL'), ('AUTORIZACION_PUBLICACION', 'E5_REPOSITORIO'), ('CARATULA_FINAL', 'E4_VERSION_FINAL')) AS m(tipo, clave) WHERE c."requerido_en" IS NULL AND c."tipo" = m.tipo;
--> statement-breakpoint
UPDATE "jurados_expediente" j SET "instancia" = 'TERNA' FROM "expedientes" e WHERE e."id" = j."expediente_id" AND e."estado" IN ('REGISTRADO', 'EN_PLAN');
