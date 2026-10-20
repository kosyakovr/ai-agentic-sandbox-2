CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"author_name" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"cover_image_url" text,
	"cover_image_alt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "posts_slug_chk" CHECK ("posts"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("posts"."slug") <= 100),
	CONSTRAINT "posts_title_chk" CHECK (char_length("posts"."title") BETWEEN 1 AND 200),
	CONSTRAINT "posts_excerpt_chk" CHECK (char_length("posts"."excerpt") BETWEEN 1 AND 300),
	CONSTRAINT "posts_author_name_chk" CHECK (char_length("posts"."author_name") BETWEEN 1 AND 100),
	CONSTRAINT "posts_tags_chk" CHECK (cardinality("posts"."tags") <= 10),
	CONSTRAINT "posts_cover_image_alt_chk" CHECK (char_length("posts"."cover_image_alt") <= 200),
	CONSTRAINT "posts_status_chk" CHECK ("posts"."status" IN ('draft', 'published')),
	CONSTRAINT "posts_cover_pair_chk" CHECK (("posts"."cover_image_url" IS NULL) = ("posts"."cover_image_alt" IS NULL)),
	CONSTRAINT "posts_published_at_chk" CHECK ("posts"."status" <> 'published' OR "posts"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX "posts_published_list_idx" ON "posts" USING btree ("published_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "posts"."status" = 'published';