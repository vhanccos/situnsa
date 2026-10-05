ALTER TABLE "auditoria_transiciones" ADD COLUMN "actor_dni" varchar(32);--> statement-breakpoint
CREATE INDEX "auditoria_transiciones_expediente_idx" ON "auditoria_transiciones" USING btree ("expediente_id","created_at");--> statement-breakpoint
-- Backfill: el DNI que entró en el hash. Con actor_id, el del usuario; sin actor, "sistema" (inscribir-plan).
UPDATE "auditoria_transiciones" a SET "actor_dni" = u."dni" FROM "usuarios" u WHERE a."actor_id" = u."id" AND a."actor_dni" IS NULL;
--> statement-breakpoint
UPDATE "auditoria_transiciones" SET "actor_dni" = 'sistema' WHERE "actor_id" IS NULL AND "actor_dni" IS NULL;
