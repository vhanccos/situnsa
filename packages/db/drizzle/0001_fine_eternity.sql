CREATE TYPE "public"."estado_subetapa" AS ENUM('NO_INICIADO', 'EN_CURSO', 'FINALIZADO');--> statement-breakpoint
CREATE TYPE "public"."estado_taller" AS ENUM('ACTIVO', 'CERRADO');--> statement-breakpoint
CREATE TABLE "programas" (
	"codigo" varchar(16) PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subetapas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"etapa" integer NOT NULL,
	"orden" integer NOT NULL,
	"nombre" text NOT NULL,
	"plazo" varchar(120),
	"estado" "estado_subetapa" DEFAULT 'NO_INICIADO' NOT NULL,
	"responsable" varchar(255),
	"inicio" timestamp with time zone,
	"fin" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"autor_id" uuid,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talleres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"asesor_id" uuid,
	"periodo" varchar(32),
	"estado" "estado_taller" DEFAULT 'ACTIVO' NOT NULL,
	"inscritos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "nro_decreto" varchar(64);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "recomendacion" text;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "presidente" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "secretario" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "co_asesor" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "fecha_apertura" date;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "fecha_presentacion" date;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "nro_oficio" varchar(64);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "integrante" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "presidente_e2" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "secretario_e2" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "suplente_e2" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "decanal" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "fecha_sustentacion" date;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "hora_sustentacion" varchar(16);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "lugar_sustentacion" varchar(160);--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "modalidad_virtual" varchar(64);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "nacionalidad" varchar(64);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "ciudad" varchar(64);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "direccion" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "grado" varchar(16);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "activo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subetapas" ADD CONSTRAINT "subetapas_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talleres" ADD CONSTRAINT "talleres_asesor_id_usuarios_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;