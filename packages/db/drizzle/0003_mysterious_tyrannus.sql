CREATE TABLE "idempotency_keys" (
	"clave" varchar(64) PRIMARY KEY NOT NULL,
	"metodo" varchar(8) NOT NULL,
	"ruta" text NOT NULL,
	"respuesta" jsonb NOT NULL,
	"estado" varchar(8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_at" timestamp with time zone NOT NULL
);
