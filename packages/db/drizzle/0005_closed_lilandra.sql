CREATE TABLE "catalogo_docs_requeridos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etapa" varchar(8) NOT NULL,
	"tipo" varchar(64) NOT NULL,
	"nombre" text NOT NULL,
	"obligatorio" boolean DEFAULT true NOT NULL,
	CONSTRAINT "catalogo_docs_requeridos_tipo_unique" UNIQUE("tipo")
);
--> statement-breakpoint
CREATE TABLE "catalogo_etapas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer NOT NULL,
	"nombre" text NOT NULL,
	"responsable" varchar(255) NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "catalogo_etapas_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "catalogo_subetapas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etapa_numero" integer NOT NULL,
	"orden" integer NOT NULL,
	"nombre" text NOT NULL,
	"plazo" varchar(120),
	"obligatoria" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalogo_subetapas" ADD CONSTRAINT "catalogo_subetapas_etapa_numero_catalogo_etapas_numero_fk" FOREIGN KEY ("etapa_numero") REFERENCES "public"."catalogo_etapas"("numero") ON DELETE no action ON UPDATE no action;