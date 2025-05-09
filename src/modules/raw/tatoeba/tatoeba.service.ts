import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TatoebaSentence } from '../entities/tatoeba-sentence.entity';

@Injectable()
export class TatoebaService implements OnModuleInit {
  private readonly logger = new Logger(TatoebaService.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(TatoebaSentence)
    private tatoebaSentenceRepository: Repository<TatoebaSentence>,
  ) {}

  /**
   * 使用 &@ 操作符搜索例句（精确匹配）
   * @param query 搜索关键词
   * @param lang 语言代码（可选）
   * @param limit 返回结果数量限制
   * @param offset 分页偏移量
   */
  async searchSentences(
    query: string,
    lang?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ sentences: TatoebaSentence[]; total: number }> {
    const qb = this.tatoebaSentenceRepository
      .createQueryBuilder('sentence')
      .where('sentence.text &@ :query', { query });

    if (lang) {
      qb.andWhere('sentence.lang = :lang', { lang });
    }

    const [sentences, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { sentences, total };
  }

  /**
   * 使用 &@~ 操作符搜索例句（支持查询语法）
   * @param query 搜索查询（支持 OR、AND 等语法）
   * @param lang 语言代码（可选）
   * @param limit 返回结果数量限制
   * @param offset 分页偏移量
   */
  async searchSentencesWithQuery(
    query: string,
    lang?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ sentences: TatoebaSentence[]; total: number }> {
    const qb = this.tatoebaSentenceRepository
      .createQueryBuilder('sentence')
      .where('sentence.text &@~ :query', { query });

    if (lang) {
      qb.andWhere('sentence.lang = :lang', { lang });
    }

    const [sentences, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { sentences, total };
  }

  /**
   * 使用 LIKE 操作符搜索例句（模糊匹配）
   * @param query 搜索关键词
   * @param lang 语言代码（可选）
   * @param limit 返回结果数量限制
   * @param offset 分页偏移量
   */
  async searchSentencesLike(
    query: string,
    lang?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ sentences: TatoebaSentence[]; total: number }> {
    const qb = this.tatoebaSentenceRepository
      .createQueryBuilder('sentence')
      .where('sentence.text LIKE :query', { query: `%${query}%` });

    if (lang) {
      qb.andWhere('sentence.lang = :lang', { lang });
    }

    const [sentences, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { sentences, total };
  }

  /**
   * 使用 ILIKE 操作符搜索例句（不区分大小写的模糊匹配）
   * @param query 搜索关键词
   * @param lang 语言代码（可选）
   * @param limit 返回结果数量限制
   * @param offset 分页偏移量
   */
  async searchSentencesILike(
    query: string,
    lang?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ sentences: TatoebaSentence[]; total: number }> {
    const qb = this.tatoebaSentenceRepository
      .createQueryBuilder('sentence')
      .where('sentence.text ILIKE :query', { query: `%${query}%` });

    if (lang) {
      qb.andWhere('sentence.lang = :lang', { lang });
    }

    const [sentences, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { sentences, total };
  }

  /**
   * 获取指定语言的例句
   * @param lang 语言代码
   * @param limit 返回结果数量限制
   * @param offset 分页偏移量
   */
  async getSentencesByLang(
    lang: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ sentences: TatoebaSentence[]; total: number }> {
    const [sentences, total] = await this.tatoebaSentenceRepository.findAndCount({
      where: { lang },
      skip: offset,
      take: limit,
    });

    return { sentences, total };
  }

  /**
   * 获取指定ID的例句
   * @param id 例句ID
   */
  async getSentenceById(id: number): Promise<TatoebaSentence | null> {
    return this.tatoebaSentenceRepository.findOne({
      where: { id },
    });
  }

  /**
   * 获取例句总数
   * @param lang 语言代码（可选）
   */
  async getTotalSentences(lang?: string): Promise<number> {
    const qb = this.tatoebaSentenceRepository.createQueryBuilder('sentence');
    
    if (lang) {
      qb.where('sentence.lang = :lang', { lang });
    }

    return qb.getCount();
  }

  async onModuleInit() {
    await this.dataSource.query(CREATE_PGROONGA_TRIGGER_SQL);
  }
}

const CREATE_PGROONGA_TRIGGER_SQL = `
  CREATE EXTENSION IF NOT EXISTS pgroonga;
  CREATE INDEX IF NOT EXISTS pgroonga_content_index ON tatoeba_sentences USING pgroonga (text);
`;
