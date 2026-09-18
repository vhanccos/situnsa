CREATE TYPE "public"."estado_cuota" AS ENUM('PENDIENTE', 'PAGADA', 'VENCIDA', 'EXONERADA');--> statement-breakpoint
CREATE TYPE "public"."estado_grupo" AS ENUM('PLANIFICADO', 'ACTIVO', 'CONCLUIDO');--> statement-breakpoint
CREATE TABLE "cronograma_pensiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grupo_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nro_cuota" integer NOT NULL,
	"monto" integer NOT NULL,
	"vencimiento" date NOT NULL,
	"estado" "estado_cuota" DEFAULT 'PENDIENTE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupo_miembros" (
	"grupo_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	CONSTRAINT "grupo_miembros_grupo_id_usuario_id_pk" PRIMARY KEY("grupo_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "grupos_taller" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"asesor_id" uuid,
	"estado" "estado_grupo" DEFAULT 'PLANIFICADO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_taller" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cronograma_id" uuid NOT NULL,
	"monto" integer NOT NULL,
	"medio" varchar(32) DEFAULT 'CAJA' NOT NULL,
	"referencia" varchar(64),
	"registrado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cronograma_pensiones" ADD CONSTRAINT "cronograma_pensiones_grupo_id_grupos_taller_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_taller"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cronograma_pensiones" ADD CONSTRAINT "cronograma_pensiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupo_miembros" ADD CONSTRAINT "grupo_miembros_grupo_id_grupos_taller_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_taller"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupo_miembros" ADD CONSTRAINT "grupo_miembros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupos_taller" ADD CONSTRAINT "grupos_taller_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupos_taller" ADD CONSTRAINT "grupos_taller_asesor_id_usuarios_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_taller" ADD CONSTRAINT "pagos_taller_cronograma_id_cronograma_pensiones_id_fk" FOREIGN KEY ("cronograma_id") REFERENCES "public"."cronograma_pensiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_taller" ADD CONSTRAINT "pagos_taller_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;