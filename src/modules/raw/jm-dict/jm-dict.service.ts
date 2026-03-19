import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JMDict } from '../entities/jm-dict.entity';

@Injectable()
export class JmDictService {
  constructor(
    @InjectRepository(JMDict)
    private jmDictRepository: Repository<JMDict>,
  ) {}

  /**
   * Find entries by kanji (exact element match in text[])
   */
  async findByKanji(kanji: string): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where(':kanji = ANY(j.keb)', { kanji })
      .getMany();
  }

  /**
   * Find entries by multiple kanji terms (bulk search using && overlap)
   */
  async findByKanjiBulk(terms: string[]): Promise<JMDict[]> {
    if (!terms.length) return [];
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where('j.keb && :terms::text[]', { terms })
      .getMany();
  }

  /**
   * Find entries by kanji (partial match — element in array)
   */
  async findByKanjiPartial(kanji: string): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where(':kanji = ANY(j.keb)', { kanji })
      .getMany();
  }

  /**
   * Find entries by reading (exact element match in text[])
   */
  async findByReading(reading: string): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where(':reading = ANY(j.reb)', { reading })
      .getMany();
  }

  /**
   * Find entries by multiple reading terms (bulk search using && overlap)
   */
  async findByReadingBulk(readings: string[]): Promise<JMDict[]> {
    if (!readings.length) return [];
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where('j.reb && :readings::text[]', { readings })
      .getMany();
  }

  /**
   * Find entries by reading (partial match)
   */
  async findByReadingPartial(reading: string): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where(':reading = ANY(j.reb)', { reading })
      .getMany();
  }

  /**
   * Search by kanji (element match)
   */
  async search(term: string): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where(':term = ANY(j.keb)', { term })
      .orWhere(':term = ANY(j.reb)', { term })
      .getMany();
  }

  /**
   * Bulk search by either kanji or reading (overlap operator)
   */
  async searchBulk(terms: string[]): Promise<JMDict[]> {
    if (!terms.length) return [];
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where('j.keb && :terms::text[]', { terms })
      .orWhere('j.reb && :terms::text[]', { terms })
      .getMany();
  }

  /**
   * Full text search across kanji, reading, and meaning
   */
  async fullTextSearch(query: string, limit: number = 20): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where(':query = ANY(j.keb)', { query })
      .orWhere(':query = ANY(j.reb)', { query })
      .orWhere(':query = ANY(j.gloss)', { query })
      .limit(limit)
      .getMany();
  }

  /**
   * Find entries by meaning
   */
  async findByMeaning(meaning: string, limit: number = 20): Promise<JMDict[]> {
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where(':meaning = ANY(j.gloss)', { meaning })
      .limit(limit)
      .getMany();
  }

  /**
   * Find entries by multiple meanings (bulk)
   */
  async findByMeaningBulk(meanings: string[], limit: number = 50): Promise<JMDict[]> {
    if (!meanings.length) return [];
    return this.jmDictRepository
      .createQueryBuilder('j')
      .where('j.gloss && :meanings::text[]', { meanings })
      .limit(limit)
      .getMany();
  }
}
