import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVocabJlptLevel1762000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anki-vocab"
        ADD COLUMN IF NOT EXISTS "jlpt_level" varchar NULL;
    `);

    await queryRunner.query(`
      UPDATE "anki-vocab"
      SET "jlpt_level" = CASE
        WHEN array_length("jlpt", 1) >= 1 AND "jlpt"[1] IN ('N5', 'N4', 'N3', 'N2', 'N1') THEN "jlpt"[1]
        ELSE NULL
      END
      WHERE "jlpt_level" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anki-vocab"
        DROP COLUMN IF EXISTS "jlpt_level";
    `);
  }
}
