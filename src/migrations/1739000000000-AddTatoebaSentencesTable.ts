import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTatoebaSentencesTable1739000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tatoeba_sentences (
        id integer PRIMARY KEY,
        lang varchar(3) NOT NULL,
        text text NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建语言索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tatoeba_sentences_lang ON tatoeba_sentences (lang);
    `);

    // 创建 pgroonga 索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS pgroonga_text_index ON tatoeba_sentences USING pgroonga (text);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tatoeba_sentences;`);
  }
} 