import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVocabSrsFields1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anki-vocab"
        ADD COLUMN IF NOT EXISTS "interval_days" integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "next_review" timestamp NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anki-vocab"
        DROP COLUMN IF EXISTS "interval_days",
        DROP COLUMN IF EXISTS "next_review";
    `);
  }
}
