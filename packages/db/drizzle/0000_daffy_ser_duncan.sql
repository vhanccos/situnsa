CREATE TYPE "public"."estado_documento" AS ENUM('PENDIENTE', 'CARGADO', 'OBSERVADO', 'APROBADO', 'RECHAZADO');--> statement-breakpoint
CREATE TYPE "public"."estado_expediente" AS ENUM('REGISTRADO', 'EN_PLAN', 'PLAN_APROBADO', 'EN_BORRADOR', 'EN_DICTAMEN', 'APTO_SUSTENTACION', 'SUSTENTADO', 'EN_VALIDACION', 'EN_APROBACION', 'TITULO_EMITIDO', 'OBSERVADO', 'DESAPROBADO_TRUNCO', 'ANULADO');--> statement-breakpoint
CREATE TYPE "public"."modalidad" AS ENUM('TESIS', 'TRABAJO_ACADEMICO', 'ARTICULO');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('TESISTA', 'ASESOR', 'JURADO', 'ADMIN_FIPS', 'SECRETARIA', 'DECANO', 'INVITADO');--> statement-breakpoint
CREATE TABLE "auditoria_transiciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"actor_id" uuid,
	"estado_anterior" varchar(32),
	"estado_nuevo" varchar(32) NOT NULL,
	"hash_previo" varchar(64),
	"hash" varchar(64) NOT NULL,
	"detalle" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"tipo" varchar(64) NOT NULL,
	"etapa" varchar(8) DEFAULT 'E1' NOT NULL,
	"ruta" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"estado" "estado_documento" DEFAULT 'CARGADO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(32) NOT NULL,
	"estado" "estado_expediente" DEFAULT 'REGISTRADO' NOT NULL,
	"modalidad" "modalidad" NOT NULL,
	"programa" varchar(160) NOT NULL,
	"titulo" text NOT NULL,
	"participante1_id" uuid,
	"participante2_id" uuid,
	"asesor_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expedientes_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dni" varchar(8) NOT NULL,
	"cui" varchar(16),
	"email" varchar(255) NOT NULL,
	"nombres" text NOT NULL,
	"apellidos" text NOT NULL,
	"rol" "rol_usuario" NOT NULL,
	"telefono" varchar(20),
	"password_hash" text,
	"google_sub" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_dni_unique" UNIQUE("dni"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auditoria_transiciones" ADD CONSTRAINT "auditoria_transiciones_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_participante1_id_usuarios_id_fk" FOREIGN KEY ("participante1_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_participante2_id_usuarios_id_fk" FOREIGN KEY ("participante2_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_asesor_id_usuarios_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;