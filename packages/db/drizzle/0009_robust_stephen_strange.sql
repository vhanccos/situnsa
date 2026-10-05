CREATE TABLE "propuestas_sustentacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"desde" date NOT NULL,
	"hasta" date NOT NULL,
	"comentario" text,
	"propuesta_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "propuestas_sustentacion_rango" CHECK ("propuestas_sustentacion"."hasta" > "propuestas_sustentacion"."desde")
);
--> statement-breakpoint
ALTER TABLE "propuestas_sustentacion" ADD CONSTRAINT "propuestas_sustentacion_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas_sustentacion" ADD CONSTRAINT "propuestas_sustentacion_propuesta_por_usuarios_id_fk" FOREIGN KEY ("propuesta_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "propuestas_sustentacion_expediente_idx" ON "propuestas_sustentacion" USING btree ("expediente_id","created_at");