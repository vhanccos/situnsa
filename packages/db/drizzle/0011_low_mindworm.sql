CREATE TYPE "public"."estado_asistencia" AS ENUM('PENDIENTE', 'PRESENTE', 'FALTA', 'JUSTIFICADA');--> statement-breakpoint
CREATE TYPE "public"."estado_cumplimiento" AS ENUM('PENDIENTE', 'CUMPLIDA', 'OBSERVADA');--> statement-breakpoint
CREATE TYPE "public"."estado_entrega" AS ENUM('ENTREGADA', 'CONFORME', 'OBSERVADA');--> statement-breakpoint
CREATE TYPE "public"."estado_sesion" AS ENUM('PROGRAMADA', 'ABIERTA', 'REALIZADA', 'CANCELADA');--> statement-breakpoint
ALTER TYPE "public"."estado_cuota" ADD VALUE 'EN_REVISION' BEFORE 'PAGADA';--> statement-breakpoint
ALTER TYPE "public"."estado_cuota" ADD VALUE 'VALIDADO' BEFORE 'PAGADA';--> statement-breakpoint
ALTER TYPE "public"."estado_cuota" ADD VALUE 'OBSERVADO' BEFORE 'PAGADA';--> statement-breakpoint
ALTER TYPE "public"."estado_taller" ADD VALUE 'CANCELADO';--> statement-breakpoint
CREATE TABLE "auditoria_taller" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_dni" varchar(32),
	"accion" varchar(64) NOT NULL,
	"detalle" text,
	"hash_previo" varchar(64),
	"hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taller_asistencias" (
	"sesion_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"estado" "estado_asistencia" DEFAULT 'PENDIENTE' NOT NULL,
	"marcada_at" timestamp with time zone,
	"motivo" text,
	"actualizada_por" uuid,
	CONSTRAINT "taller_asistencias_sesion_id_usuario_id_pk" PRIMARY KEY("sesion_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "taller_avances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"sesion_id" uuid,
	"descripcion" text NOT NULL,
	"plazo" date NOT NULL,
	"solicitado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taller_cumplimiento" (
	"fase_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"estado" "estado_cumplimiento" DEFAULT 'PENDIENTE' NOT NULL,
	"comentario" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taller_cumplimiento_fase_id_usuario_id_pk" PRIMARY KEY("fase_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "taller_entregas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avance_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"ruta" text NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"nombre_original" varchar(255) NOT NULL,
	"version" integer NOT NULL,
	"estado" "estado_entrega" DEFAULT 'ENTREGADA' NOT NULL,
	"observacion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taller_fases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"descripcion" text,
	"fecha_ref" date,
	"orden" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taller_pases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"validado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taller_sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"nro" integer NOT NULL,
	"fecha" date NOT NULL,
	"hora_inicio" varchar(5) NOT NULL,
	"hora_fin" varchar(5) NOT NULL,
	"estado" "estado_sesion" DEFAULT 'PROGRAMADA' NOT NULL,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cronograma_pensiones" ADD COLUMN "comprobante_ruta" text;--> statement-breakpoint
ALTER TABLE "cronograma_pensiones" ADD COLUMN "comprobante_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "cronograma_pensiones" ADD COLUMN "motivo" text;--> statement-breakpoint
ALTER TABLE "talleres" ADD COLUMN "fecha_inicio" date;--> statement-breakpoint
ALTER TABLE "talleres" ADD COLUMN "dias_sesion" varchar(16);--> statement-breakpoint
ALTER TABLE "talleres" ADD COLUMN "hora_inicio" varchar(5);--> statement-breakpoint
ALTER TABLE "talleres" ADD COLUMN "hora_fin" varchar(5);--> statement-breakpoint
ALTER TABLE "talleres" ADD COLUMN "cupo_max" integer;--> statement-breakpoint
ALTER TABLE "talleres" ADD COLUMN "enlace" varchar(512);--> statement-breakpoint
ALTER TABLE "auditoria_taller" ADD CONSTRAINT "auditoria_taller_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria_taller" ADD CONSTRAINT "auditoria_taller_actor_id_usuarios_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_asistencias" ADD CONSTRAINT "taller_asistencias_sesion_id_taller_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."taller_sesiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_asistencias" ADD CONSTRAINT "taller_asistencias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_asistencias" ADD CONSTRAINT "taller_asistencias_actualizada_por_usuarios_id_fk" FOREIGN KEY ("actualizada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_avances" ADD CONSTRAINT "taller_avances_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_avances" ADD CONSTRAINT "taller_avances_sesion_id_taller_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."taller_sesiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_avances" ADD CONSTRAINT "taller_avances_solicitado_por_usuarios_id_fk" FOREIGN KEY ("solicitado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_cumplimiento" ADD CONSTRAINT "taller_cumplimiento_fase_id_taller_fases_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."taller_fases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_cumplimiento" ADD CONSTRAINT "taller_cumplimiento_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_entregas" ADD CONSTRAINT "taller_entregas_avance_id_taller_avances_id_fk" FOREIGN KEY ("avance_id") REFERENCES "public"."taller_avances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_entregas" ADD CONSTRAINT "taller_entregas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_fases" ADD CONSTRAINT "taller_fases_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_pases" ADD CONSTRAINT "taller_pases_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_pases" ADD CONSTRAINT "taller_pases_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_pases" ADD CONSTRAINT "taller_pases_validado_por_usuarios_id_fk" FOREIGN KEY ("validado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_sesiones" ADD CONSTRAINT "taller_sesiones_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_taller_taller_idx" ON "auditoria_taller" USING btree ("taller_id","created_at");--> statement-breakpoint
CREATE INDEX "taller_avances_taller_idx" ON "taller_avances" USING btree ("taller_id","created_at");--> statement-breakpoint
CREATE INDEX "taller_entregas_avance_idx" ON "taller_entregas" USING btree ("avance_id","usuario_id","version");--> statement-breakpoint
CREATE INDEX "taller_fases_taller_idx" ON "taller_fases" USING btree ("taller_id","orden");--> statement-breakpoint
CREATE INDEX "taller_pases_taller_idx" ON "taller_pases" USING btree ("taller_id","usuario_id");--> statement-breakpoint
CREATE INDEX "taller_sesiones_taller_idx" ON "taller_sesiones" USING btree ("taller_id","nro");