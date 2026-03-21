import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVocabStatsFields1742000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anki-vocab"
        ADD COLUMN IF NOT EXISTS "review_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "is_known" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "added_at" timestamp NOT NULL DEFAULT now();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anki-vocab"
        DROP COLUMN IF EXISTS "review_count",
        DROP COLUMN IF EXISTS "is_known",
        DROP COLUMN IF EXISTS "added_at";
    `);
  }
}
