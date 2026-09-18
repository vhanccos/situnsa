CREATE TABLE "jurados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dni" varchar(8) NOT NULL,
	"nombres" text NOT NULL,
	"apellidos" text NOT NULL,
	"grado" varchar(16),
	"email" varchar(255),
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "jurados_dni_unique" UNIQUE("dni")
);
--> statement-breakpoint
CREATE TABLE "jurados_expediente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurado_id" uuid NOT NULL,
	"expediente_id" uuid NOT NULL,
	"rol" varchar(16) DEFAULT 'VOCAL' NOT NULL,
	"dictamen" varchar(16) DEFAULT 'PENDIENTE' NOT NULL,
	"comentario" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sustentaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"fecha" varchar(32) NOT NULL,
	"hora" varchar(16) NOT NULL,
	"lugar" text NOT NULL,
	"modalidad" varchar(16) DEFAULT 'PRESENCIAL' NOT NULL,
	"acta_veredicto" varchar(16),
	"acta_fecha" timestamp with time zone,
	CONSTRAINT "sustentaciones_expediente_id_unique" UNIQUE("expediente_id")
);
--> statement-breakpoint
CREATE TABLE "validaciones_institucionales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"instancia" varchar(32) NOT NULL,
	"estado" varchar(16) DEFAULT 'PENDIENTE' NOT NULL,
	"detalle" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jurados_expediente" ADD CONSTRAINT "jurados_expediente_jurado_id_jurados_id_fk" FOREIGN KEY ("jurado_id") REFERENCES "public"."jurados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurados_expediente" ADD CONSTRAINT "jurados_expediente_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sustentaciones" ADD CONSTRAINT "sustentaciones_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validaciones_institucionales" ADD CONSTRAINT "validaciones_institucionales_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;