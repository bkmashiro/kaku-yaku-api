import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, In } from 'typeorm';
import { KanjiDict } from '../entities/kanji-dict.entity';

@Injectable()
export class KanjiDictService {
  constructor(
    @InjectRepository(KanjiDict)
    private kanjiDictRepository: Repository<KanjiDict>,
  ) {}

  /**
   * Find a kanji entry by its literal character
   */
  async findByLiteral(literal: string): Promise<KanjiDict | null> {
    return this.kanjiDictRepository.findOne({
      where: { literal },
    });
  }

  /**
   * Find multiple kanji entries by their literal characters
   */
  async findByLiterals(literals: string[]): Promise<KanjiDict[]> {
    return this.kanjiDictRepository.find({
      where: { literal: In(literals) },
    });
  }

  // /**
  //  * Find kanji by on reading
  //  */
  // async findByOnReading(reading: string): Promise<KanjiDict[]> {
  //   return this.kanjiDictRepository
  //     .createQueryBuilder('kanji')
  //     .where(':reading = ANY(kanji.onReadings)', { reading })
  //     .getMany();
  // }

  /**
   * Find kanji by multiple on readings (bulk search)
   */
  // async findByOnReadingBulk(readings: string[]): Promise<KanjiDict[]> {
  //   if (!readings.length) return [];
    
  //   return this.kanjiDictRepository
  //     .createQueryBuilder('kanji')
  //     .where(`kanji.onReadings && ARRAY[:...readings]`, { readings })
  //     .getMany();
  // }

  /**
   * Find kanji by kun reading
   */
  // async findByKunReading(reading: string): Promise<KanjiDict[]> {
  //   return this.kanjiDictRepository
  //     .createQueryBuilder('kanji')
  //     .where(':reading = ANY(kanji.kunReadings)', { reading })
  //     .getMany();
  // }

  /**
   * Find kanji by multiple kun readings (bulk search)
   */
  // async findByKunReadingBulk(readings: string[]): Promise<KanjiDict[]> {
  //   if (!readings.length) return [];
    
  //   return this.kanjiDictRepository
  //     .createQueryBuilder('kanji')
  //     .where(`kanji.kunReadings && ARRAY[:...readings]`, { readings })
  //     .getMany();
  // }

  /**
   * Find kanji by meaning in a specific language
   */
  async findByMeaning(meaning: string, lang: string = 'en'): Promise<KanjiDict[]> {
    return this.kanjiDictRepository
      .createQueryBuilder('kanji')
      .where(`kanji.meanings ->> :lang ILIKE :meaning`, {
        lang,
        meaning: `%${meaning}%`,
      })
      .getMany();
  }

  /**
   * Find kanji by multiple meanings in a specific language (bulk search)
   */
  async findByMeaningBulk(meanings: string[], lang: string = 'en'): Promise<KanjiDict[]> {
    if (!meanings.length) return [];
    
    // Since meanings are stored as JSON, we need to check each meaning individually
    const queryBuilder = this.kanjiDictRepository.createQueryBuilder('kanji');
    
    // Create OR conditions for each meaning
    const conditions = meanings.map((_, index) => 
      `kanji.meanings ->> :lang ILIKE :meaning${index}`
    );
    
    // Add parameters for each meaning
    const parameters: Record<string, any> = { lang };
    meanings.forEach((meaning, index) => {
      parameters[`meaning${index}`] = `%${meaning}%`;
    });
    
    return queryBuilder
      .where(conditions.join(' OR '), parameters)
      .getMany();
  }

  /**
   * Find kanji by JLPT level
   */
  async findByJlptLevel(level: number): Promise<KanjiDict[]> {
    return this.kanjiDictRepository.find({
      where: { jlptLevel: level },
    });
  }

  /**
   * Find kanji by grade level
   */
  async findByGrade(grade: string): Promise<KanjiDict[]> {
    return this.kanjiDictRepository.find({
      where: { grade },
    });
  }

  /**
   * Find kanji by stroke count
   */
  async findByStrokeCount(count: number): Promise<KanjiDict[]> {
    return this.kanjiDictRepository.find({
      where: { strokeCount: count },
    });
  }

  /**
   * Advanced search with multiple criteria
   */
  async search(params: {
    literal?: string;
    onReading?: string;
    kunReading?: string;
    meaning?: string;
    jlptLevel?: number;
    grade?: string;
    strokeCount?: number;
  }): Promise<KanjiDict[]> {
    const query = this.kanjiDictRepository.createQueryBuilder('kanji');
    let hasCondition = false;

    if (params.literal) {
      query.where('kanji.literal = :literal', { literal: params.literal });
      hasCondition = true;
    }

    if (params.onReading) {
      const method = hasCondition ? 'andWhere' : 'where';
      query[method](':onReading = ANY(kanji.onReadings)', { 
        onReading: params.onReading 
      });
      hasCondition = true;
    }

    if (params.kunReading) {
      const method = hasCondition ? 'andWhere' : 'where';
      query[method](':kunReading = ANY(kanji.kunReadings)', { 
        kunReading: params.kunReading 
      });
      hasCondition = true;
    }

    if (params.meaning) {
      const method = hasCondition ? 'andWhere' : 'where';
      query[method](`kanji.meanings ->> 'en' ILIKE :meaning`, {
        meaning: `%${params.meaning}%`,
      });
      hasCondition = true;
    }

    if (params.jlptLevel) {
      const method = hasCondition ? 'andWhere' : 'where';
      query[method]('kanji.jlptLevel = :jlptLevel', {
        jlptLevel: params.jlptLevel,
      });
      hasCondition = true;
    }

    if (params.grade) {
      const method = hasCondition ? 'andWhere' : 'where';
      query[method]('kanji.grade = :grade', { grade: params.grade });
      hasCondition = true;
    }

    if (params.strokeCount) {
      const method = hasCondition ? 'andWhere' : 'where';
      query[method]('kanji.strokeCount = :strokeCount', {
        strokeCount: params.strokeCount,
      });
      hasCondition = true;
    }

    return query.getMany();
  }
}
