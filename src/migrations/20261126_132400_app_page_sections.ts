import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "apps_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar
  );
  
  CREATE TABLE "apps_highlights_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "apps_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "apps_how_it_works_steps_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_apps_v_version_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_apps_v_version_highlights_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_apps_v_version_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_apps_v_version_how_it_works_steps_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "apps_features" ADD COLUMN "icon" varchar;
  ALTER TABLE "apps_features_locales" ADD COLUMN "description" varchar;
  ALTER TABLE "apps" ADD COLUMN "accent_color" varchar;
  ALTER TABLE "apps_locales" ADD COLUMN "how_it_works_title" varchar;
  ALTER TABLE "apps_locales" ADD COLUMN "how_it_works_description" varchar;
  ALTER TABLE "apps_locales" ADD COLUMN "features_intro_title" varchar;
  ALTER TABLE "apps_locales" ADD COLUMN "features_intro_description" varchar;
  ALTER TABLE "apps_locales" ADD COLUMN "data_control_title" varchar;
  ALTER TABLE "apps_locales" ADD COLUMN "data_control_description" varchar;
  ALTER TABLE "_apps_v_version_features" ADD COLUMN "icon" varchar;
  ALTER TABLE "_apps_v_version_features_locales" ADD COLUMN "description" varchar;
  ALTER TABLE "_apps_v" ADD COLUMN "version_accent_color" varchar;
  ALTER TABLE "_apps_v_locales" ADD COLUMN "version_how_it_works_title" varchar;
  ALTER TABLE "_apps_v_locales" ADD COLUMN "version_how_it_works_description" varchar;
  ALTER TABLE "_apps_v_locales" ADD COLUMN "version_features_intro_title" varchar;
  ALTER TABLE "_apps_v_locales" ADD COLUMN "version_features_intro_description" varchar;
  ALTER TABLE "_apps_v_locales" ADD COLUMN "version_data_control_title" varchar;
  ALTER TABLE "_apps_v_locales" ADD COLUMN "version_data_control_description" varchar;
  ALTER TABLE "apps_highlights" ADD CONSTRAINT "apps_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "apps_highlights_locales" ADD CONSTRAINT "apps_highlights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."apps_highlights"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "apps_how_it_works_steps" ADD CONSTRAINT "apps_how_it_works_steps_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "apps_how_it_works_steps" ADD CONSTRAINT "apps_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "apps_how_it_works_steps_locales" ADD CONSTRAINT "apps_how_it_works_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."apps_how_it_works_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_apps_v_version_highlights" ADD CONSTRAINT "_apps_v_version_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_apps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_apps_v_version_highlights_locales" ADD CONSTRAINT "_apps_v_version_highlights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_apps_v_version_highlights"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_apps_v_version_how_it_works_steps" ADD CONSTRAINT "_apps_v_version_how_it_works_steps_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_apps_v_version_how_it_works_steps" ADD CONSTRAINT "_apps_v_version_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_apps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_apps_v_version_how_it_works_steps_locales" ADD CONSTRAINT "_apps_v_version_how_it_works_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_apps_v_version_how_it_works_steps"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "apps_highlights_order_idx" ON "apps_highlights" USING btree ("_order");
  CREATE INDEX "apps_highlights_parent_id_idx" ON "apps_highlights" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "apps_highlights_locales_locale_parent_id_unique" ON "apps_highlights_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "apps_highlights_locales_parent_id_idx" ON "apps_highlights_locales" USING btree ("_parent_id");
  CREATE INDEX "apps_how_it_works_steps_order_idx" ON "apps_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "apps_how_it_works_steps_parent_id_idx" ON "apps_how_it_works_steps" USING btree ("_parent_id");
  CREATE INDEX "apps_how_it_works_steps_image_idx" ON "apps_how_it_works_steps" USING btree ("image_id");
  CREATE UNIQUE INDEX "apps_how_it_works_steps_locales_locale_parent_id_unique" ON "apps_how_it_works_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "apps_how_it_works_steps_locales_parent_id_idx" ON "apps_how_it_works_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "_apps_v_version_highlights_order_idx" ON "_apps_v_version_highlights" USING btree ("_order");
  CREATE INDEX "_apps_v_version_highlights_parent_id_idx" ON "_apps_v_version_highlights" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_apps_v_version_highlights_locales_locale_parent_id_unique" ON "_apps_v_version_highlights_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_apps_v_version_highlights_locales_parent_id_idx" ON "_apps_v_version_highlights_locales" USING btree ("_parent_id");
  CREATE INDEX "_apps_v_version_how_it_works_steps_order_idx" ON "_apps_v_version_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "_apps_v_version_how_it_works_steps_parent_id_idx" ON "_apps_v_version_how_it_works_steps" USING btree ("_parent_id");
  CREATE INDEX "_apps_v_version_how_it_works_steps_image_idx" ON "_apps_v_version_how_it_works_steps" USING btree ("image_id");
  CREATE UNIQUE INDEX "_apps_v_version_how_it_works_steps_locales_locale_parent_id_" ON "_apps_v_version_how_it_works_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_apps_v_version_how_it_works_steps_locales_parent_id_idx" ON "_apps_v_version_how_it_works_steps_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "apps_highlights" CASCADE;
  DROP TABLE "apps_highlights_locales" CASCADE;
  DROP TABLE "apps_how_it_works_steps" CASCADE;
  DROP TABLE "apps_how_it_works_steps_locales" CASCADE;
  DROP TABLE "_apps_v_version_highlights" CASCADE;
  DROP TABLE "_apps_v_version_highlights_locales" CASCADE;
  DROP TABLE "_apps_v_version_how_it_works_steps" CASCADE;
  DROP TABLE "_apps_v_version_how_it_works_steps_locales" CASCADE;
  ALTER TABLE "apps_features" DROP COLUMN "icon";
  ALTER TABLE "apps_features_locales" DROP COLUMN "description";
  ALTER TABLE "apps" DROP COLUMN "accent_color";
  ALTER TABLE "apps_locales" DROP COLUMN "how_it_works_title";
  ALTER TABLE "apps_locales" DROP COLUMN "how_it_works_description";
  ALTER TABLE "apps_locales" DROP COLUMN "features_intro_title";
  ALTER TABLE "apps_locales" DROP COLUMN "features_intro_description";
  ALTER TABLE "apps_locales" DROP COLUMN "data_control_title";
  ALTER TABLE "apps_locales" DROP COLUMN "data_control_description";
  ALTER TABLE "_apps_v_version_features" DROP COLUMN "icon";
  ALTER TABLE "_apps_v_version_features_locales" DROP COLUMN "description";
  ALTER TABLE "_apps_v" DROP COLUMN "version_accent_color";
  ALTER TABLE "_apps_v_locales" DROP COLUMN "version_how_it_works_title";
  ALTER TABLE "_apps_v_locales" DROP COLUMN "version_how_it_works_description";
  ALTER TABLE "_apps_v_locales" DROP COLUMN "version_features_intro_title";
  ALTER TABLE "_apps_v_locales" DROP COLUMN "version_features_intro_description";
  ALTER TABLE "_apps_v_locales" DROP COLUMN "version_data_control_title";
  ALTER TABLE "_apps_v_locales" DROP COLUMN "version_data_control_description";`)
}
