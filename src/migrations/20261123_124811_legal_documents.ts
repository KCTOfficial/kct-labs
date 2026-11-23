import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_document_types_icon" AS ENUM('shield-check', 'scroll-text', 'file-check', 'user-x', 'lock', 'file-text');
  CREATE TYPE "public"."enum_app_documents_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__app_documents_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__app_documents_v_published_locale" AS ENUM('en', 'id');
  CREATE TABLE "document_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum_document_types_icon" DEFAULT 'file-text',
  	"sort_order" numeric DEFAULT 0,
  	"required_for_play" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "document_types_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "app_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"app_id" integer,
  	"document_type_id" integer,
  	"slug" varchar,
  	"effective_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_app_documents_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "app_documents_locales" (
  	"title" varchar,
  	"markdown" varchar,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_app_documents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_app_id" integer,
  	"version_document_type_id" integer,
  	"version_slug" varchar,
  	"version_effective_date" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__app_documents_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__app_documents_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_app_documents_v_locales" (
  	"version_title" varchar,
  	"version_markdown" varchar,
  	"version_content" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "document_types_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "app_documents_id" integer;
  ALTER TABLE "document_types_locales" ADD CONSTRAINT "document_types_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."document_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "app_documents" ADD CONSTRAINT "app_documents_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "app_documents" ADD CONSTRAINT "app_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "app_documents_locales" ADD CONSTRAINT "app_documents_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "app_documents_locales" ADD CONSTRAINT "app_documents_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."app_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_app_documents_v" ADD CONSTRAINT "_app_documents_v_parent_id_app_documents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."app_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_app_documents_v" ADD CONSTRAINT "_app_documents_v_version_app_id_apps_id_fk" FOREIGN KEY ("version_app_id") REFERENCES "public"."apps"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_app_documents_v" ADD CONSTRAINT "_app_documents_v_version_document_type_id_document_types_id_fk" FOREIGN KEY ("version_document_type_id") REFERENCES "public"."document_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_app_documents_v_locales" ADD CONSTRAINT "_app_documents_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_app_documents_v_locales" ADD CONSTRAINT "_app_documents_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_app_documents_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "document_types_sort_order_idx" ON "document_types" USING btree ("sort_order");
  CREATE UNIQUE INDEX "document_types_slug_idx" ON "document_types" USING btree ("slug");
  CREATE INDEX "document_types_updated_at_idx" ON "document_types" USING btree ("updated_at");
  CREATE INDEX "document_types_created_at_idx" ON "document_types" USING btree ("created_at");
  CREATE UNIQUE INDEX "document_types_locales_locale_parent_id_unique" ON "document_types_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "document_types_locales_parent_id_idx" ON "document_types_locales" USING btree ("_parent_id");
  CREATE INDEX "app_documents_app_idx" ON "app_documents" USING btree ("app_id");
  CREATE INDEX "app_documents_document_type_idx" ON "app_documents" USING btree ("document_type_id");
  CREATE INDEX "app_documents_slug_idx" ON "app_documents" USING btree ("slug");
  CREATE INDEX "app_documents_updated_at_idx" ON "app_documents" USING btree ("updated_at");
  CREATE INDEX "app_documents_created_at_idx" ON "app_documents" USING btree ("created_at");
  CREATE INDEX "app_documents__status_idx" ON "app_documents" USING btree ("_status");
  CREATE UNIQUE INDEX "app_slug_idx" ON "app_documents" USING btree ("app_id","slug");
  CREATE UNIQUE INDEX "app_documentType_idx" ON "app_documents" USING btree ("app_id","document_type_id");
  CREATE INDEX "app_documents_meta_meta_image_idx" ON "app_documents_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "app_documents_locales_locale_parent_id_unique" ON "app_documents_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "app_documents_locales_parent_id_idx" ON "app_documents_locales" USING btree ("_parent_id");
  CREATE INDEX "_app_documents_v_parent_idx" ON "_app_documents_v" USING btree ("parent_id");
  CREATE INDEX "_app_documents_v_version_version_app_idx" ON "_app_documents_v" USING btree ("version_app_id");
  CREATE INDEX "_app_documents_v_version_version_document_type_idx" ON "_app_documents_v" USING btree ("version_document_type_id");
  CREATE INDEX "_app_documents_v_version_version_slug_idx" ON "_app_documents_v" USING btree ("version_slug");
  CREATE INDEX "_app_documents_v_version_version_updated_at_idx" ON "_app_documents_v" USING btree ("version_updated_at");
  CREATE INDEX "_app_documents_v_version_version_created_at_idx" ON "_app_documents_v" USING btree ("version_created_at");
  CREATE INDEX "_app_documents_v_version_version__status_idx" ON "_app_documents_v" USING btree ("version__status");
  CREATE INDEX "_app_documents_v_created_at_idx" ON "_app_documents_v" USING btree ("created_at");
  CREATE INDEX "_app_documents_v_updated_at_idx" ON "_app_documents_v" USING btree ("updated_at");
  CREATE INDEX "_app_documents_v_snapshot_idx" ON "_app_documents_v" USING btree ("snapshot");
  CREATE INDEX "_app_documents_v_published_locale_idx" ON "_app_documents_v" USING btree ("published_locale");
  CREATE INDEX "_app_documents_v_latest_idx" ON "_app_documents_v" USING btree ("latest");
  CREATE INDEX "_app_documents_v_autosave_idx" ON "_app_documents_v" USING btree ("autosave");
  CREATE INDEX "version_app_version_slug_idx" ON "_app_documents_v" USING btree ("version_app_id","version_slug");
  CREATE INDEX "version_app_version_documentType_idx" ON "_app_documents_v" USING btree ("version_app_id","version_document_type_id");
  CREATE INDEX "_app_documents_v_version_meta_version_meta_image_idx" ON "_app_documents_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_app_documents_v_locales_locale_parent_id_unique" ON "_app_documents_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_app_documents_v_locales_parent_id_idx" ON "_app_documents_v_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_document_types_fk" FOREIGN KEY ("document_types_id") REFERENCES "public"."document_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_app_documents_fk" FOREIGN KEY ("app_documents_id") REFERENCES "public"."app_documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_document_types_id_idx" ON "payload_locked_documents_rels" USING btree ("document_types_id");
  CREATE INDEX "payload_locked_documents_rels_app_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("app_documents_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "document_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "document_types_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "app_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "app_documents_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_app_documents_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_app_documents_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "document_types" CASCADE;
  DROP TABLE "document_types_locales" CASCADE;
  DROP TABLE "app_documents" CASCADE;
  DROP TABLE "app_documents_locales" CASCADE;
  DROP TABLE "_app_documents_v" CASCADE;
  DROP TABLE "_app_documents_v_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_document_types_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_app_documents_fk";
  
  DROP INDEX "payload_locked_documents_rels_document_types_id_idx";
  DROP INDEX "payload_locked_documents_rels_app_documents_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "document_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "app_documents_id";
  DROP TYPE "public"."enum_document_types_icon";
  DROP TYPE "public"."enum_app_documents_status";
  DROP TYPE "public"."enum__app_documents_v_version_status";
  DROP TYPE "public"."enum__app_documents_v_published_locale";`)
}
