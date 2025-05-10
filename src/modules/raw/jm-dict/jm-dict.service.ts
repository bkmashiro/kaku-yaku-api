import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { JMDict } from '../entities/jm-dict.entity';

@Injectable()
export class JmDictService {
  constructor(
    @InjectRepository(JMDict)
    private jmDictRepository: Repository<JMDict>,
  ) {}

  /**
   * Find entries by kanji (exact match)
   */
  async findByKanji(kanji: string): Promise<JMDict[]> {
    return this.jmDictRepository.find({
      where: { keb: kanji },
    });
  }

  /**
   * Find entries by multiple kanji terms (bulk search)
   */
  async findByKanjiBulk(kanjiTerms: string[]): Promise<JMDict[]> {
    if (!kanjiTerms.length) return [];
    
    const query = this.jmDictRepository.createQueryBuilder('jmdict');
    
    // 使用 ANY 操作符，为每个关键词创建一个条件
    const conditions = kanjiTerms.map((_, index) => `:term${index} = ANY(jmdict.keb)`);
    const params: Record<string, any> = {};
    
    kanjiTerms.forEach((term, index) => {
      params[`term${index}`] = term;
    });
    
    return query
      .where(conditions.join(' OR '), params)
      .getMany();
  }

  /**
   * Find entries by kanji (partial match)
   */
  async findByKanjiPartial(kanji: string): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('jmdict')
      .where(':kanji = ANY(jmdict.keb)', { kanji })
      .orWhere('jmdict.keb @> ARRAY[:kanji]', { kanji })
      .getMany();
  }

  /**
   * Find entries by reading (exact match)
   */
  async findByReading(reading: string): Promise<JMDict[]> {
    return this.jmDictRepository.find({
      where: { reb: reading },
    });
  }

  /**
   * Find entries by multiple reading terms (bulk search)
   */
  async findByReadingBulk(readings: string[]): Promise<JMDict[]> {
    if (!readings.length) return [];
    
    const query = this.jmDictRepository.createQueryBuilder('jmdict');
    
    // 使用 ANY 操作符，为每个关键词创建一个条件
    const conditions = readings.map((_, index) => `:term${index} = ANY(jmdict.reb)`);
    const params: Record<string, any> = {};
    
    readings.forEach((term, index) => {
      params[`term${index}`] = term;
    });
    
    return query
      .where(conditions.join(' OR '), params)
      .getMany();
  }

  /**
   * Find entries by reading (partial match)
   */
  async findByReadingPartial(reading: string): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('jmdict')
      .where(':reading = ANY(jmdict.reb)', { reading })
      .orWhere('jmdict.reb @> ARRAY[:reading]', { reading })
      .getMany();
  }

  /**
   * Search by kanji
   */
  async search(term: string): Promise<JMDict[]> {
    return this.jmDictRepository.find({
      where: { keb: term },
    });
  }

  /**
   * Bulk search by either kanji or reading
   */
  async searchBulk(terms: string[]): Promise<JMDict[]> {
    if (!terms.length) return [];
    
    return this.jmDictRepository.find({
      where: { keb: In(terms) },
    });
  }

  /**
   * Full text search across kanji, reading, and meaning
   */
  async fullTextSearch(query: string, limit: number = 20): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('jmdict')
      .where(':query = ANY(jmdict.keb)', { query })
      .orWhere(':query = ANY(jmdict.reb)', { query })
      .orWhere(':query = ANY(jmdict.gloss)', { query })
      .orWhere('jmdict.keb @> ARRAY[:query]', { query })
      .orWhere('jmdict.reb @> ARRAY[:query]', { query })
      .limit(limit)
      .getMany();
  }

  /**
   * Find entries by meaning (for aggregated search)
   */
  async findByMeaning(meaning: string, limit: number = 20): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('jmdict')
      .where(`:meaning = ANY(jmdict.gloss)`, { meaning })
      .orWhere(`jmdict.gloss @> ARRAY[:meaning]`, { meaning })
      .limit(limit)
      .getMany();
  }

  /**
   * Find entries by multiple meanings (bulk search)
   */
  async findByMeaningBulk(meanings: string[], limit: number = 50): Promise<JMDict[]> {
    if (!meanings.length) return [];
    
    const query = this.jmDictRepository.createQueryBuilder('jmdict');
    
    // 使用 ANY 操作符，为每个关键词创建一个条件
    const conditions = meanings.map((_, index) => `:meaning${index} = ANY(jmdict.gloss)`);
    const params: Record<string, any> = {};
    
    meanings.forEach((meaning, index) => {
      params[`meaning${index}`] = meaning;
    });
    
    return query
      .where(conditions.join(' OR '), params)
      .limit(limit)
      .getMany();
  }
}
