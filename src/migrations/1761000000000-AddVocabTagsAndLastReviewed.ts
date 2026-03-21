import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVocabTagsAndLastReviewed1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anki-vocab"
        ADD COLUMN IF NOT EXISTS "tags" text[] NULL,
        ADD COLUMN IF NOT EXISTS "last_reviewed" timestamp NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anki-vocab"
        DROP COLUMN IF EXISTS "tags",
        DROP COLUMN IF EXISTS "last_reviewed";
    `);
  }
}
