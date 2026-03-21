import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnkiVocab } from '../entities/anki-vocab.entity';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  pos?: string[];
  jlpt?: string[];
  keyword?: string;
}

@Injectable()
export class AnkiService {
  constructor(
    @InjectRepository(AnkiVocab)
    private ankiVocabRepository: Repository<AnkiVocab>,
  ) {}

  async searchVocab(query: string): Promise<AnkiVocab[]> {
    const keyword = query.trim();

    if (!keyword) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    return this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .leftJoinAndSelect('vocab.sentences', 'sentences')
      .where(
        '(vocab.kanji ILIKE :keyword OR vocab.reading ILIKE :keyword OR vocab.definitionCn ILIKE :keyword OR vocab.definitionTc ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      )
      .orderBy('vocab.frequency', 'DESC', 'NULLS LAST')
      .addOrderBy('vocab.reviewCount', 'ASC')
      .addOrderBy('vocab.kanji', 'ASC')
      .getMany();
  }

  async getReviewVocab(limit = 20): Promise<AnkiVocab[]> {
    return this.ankiVocabRepository.find({
      where: { isKnown: false },
      relations: ['sentences'],
      order: {
        reviewCount: 'ASC',
        addedAt: 'ASC',
      },
      take: limit,
    });
  }

  async markReviewed(noteId: string): Promise<AnkiVocab> {
    const vocab = await this.ankiVocabRepository.findOne({ where: { noteId } });

    if (!vocab) {
      throw new NotFoundException(`Vocab "${noteId}" not found`);
    }

    vocab.reviewCount += 1;
    return this.ankiVocabRepository.save(vocab);
  }

  async markKnown(noteId: string): Promise<AnkiVocab> {
    const vocab = await this.ankiVocabRepository.findOne({ where: { noteId } });

    if (!vocab) {
      throw new NotFoundException(`Vocab "${noteId}" not found`);
    }

    vocab.isKnown = true;
    return this.ankiVocabRepository.save(vocab);
  }

  async deleteVocab(noteId: string): Promise<void> {
    const result = await this.ankiVocabRepository.delete({ noteId });

    if (!result.affected) {
      throw new NotFoundException(`Vocab "${noteId}" not found`);
    }
  }

  /**
   * 根据词性查找词汇列表
   * @param pos 词性，如 "名", "自動3", "他動1" 等
   * @param options 分页选项
   * @returns 分页的词汇列表
   */
  async findByPos(pos: string, options: PaginationOptions): Promise<PaginatedResult<AnkiVocab>> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .leftJoinAndSelect('vocab.sentences', 'sentences')
      .where(':pos = ANY(vocab.pos)', { pos })
      .orderBy('vocab.frequency', 'DESC')
      .addOrderBy('vocab.kanji', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 根据JLPT等级查找词汇列表
   * @param jlptLevel JLPT等级，如 "N1", "N2", "N3", "N4", "N5"
   * @param options 分页选项
   * @returns 分页的词汇列表
   */
  async findByJLPTLevel(jlptLevel: string, options: PaginationOptions): Promise<PaginatedResult<AnkiVocab>> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .leftJoinAndSelect('vocab.sentences', 'sentences')
      .where(':jlptLevel = vocab.jlpt', { jlptLevel })
      .orderBy('vocab.frequency', 'DESC')
      .addOrderBy('vocab.kanji', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取所有可用的词性列表
   * @returns 词性列表
   */
  async getAllPosTypes(): Promise<string[]> {
    const result = await this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .select('vocab.pos')
      .where('vocab.pos IS NOT NULL')
      .cache(true)
      .getMany();

    const allPos = result
      .flatMap(vocab => vocab.pos || [])
      .filter(pos => pos && pos.trim().length > 0);

    return [...new Set(allPos)].sort();
  }

  /**
   * 获取所有可用的JLPT等级列表
   * @returns JLPT等级列表
   */
  async getAllJLPTLevels(): Promise<string[]> {
    const result = await this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .select('vocab.jlpt')
      .where('vocab.jlpt IS NOT NULL')
      .getMany();

    // 提取所有JLPT等级并去重
    const allJLPT = result
      .flatMap(vocab => vocab.jlpt || [])
      .filter(jlpt => jlpt && jlpt.trim().length > 0);

    return [...new Set(allJLPT)].sort();
  }

  /**
   * 根据多条件筛选词汇列表
   * @param filters 筛选条件
   * @param options 分页选项
   * @returns 分页的词汇列表
   */
  async findByFilters(filters: FilterOptions, options: PaginationOptions): Promise<PaginatedResult<AnkiVocab>> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .leftJoinAndSelect('vocab.sentences', 'sentences');

    // 添加词性筛选条件
    if (filters.pos && filters.pos.length > 0) {
      const posConditions = filters.pos.map((_, index) => `:pos${index} = ANY(vocab.pos)`).join(' OR ');
      const posParams = filters.pos.reduce((params, pos, index) => {
        params[`pos${index}`] = pos;
        return params;
      }, {});
      
      queryBuilder.andWhere(`(${posConditions})`, posParams);
    }

    // 添加JLPT等级筛选条件
    if (filters.jlpt && filters.jlpt.length > 0) {
      const jlptConditions = filters.jlpt.map((_, index) => `:jlpt${index} = ANY(vocab.jlpt)`).join(' OR ');
      const jlptParams = filters.jlpt.reduce((params, jlpt, index) => {
        params[`jlpt${index}`] = jlpt;
        return params;
      }, {});
      
      queryBuilder.andWhere(`(${jlptConditions})`, jlptParams);
    }

    // 添加关键词搜索条件
    if (filters.keyword && filters.keyword.trim().length > 0) {
      queryBuilder.andWhere(
        '(vocab.kanji ILIKE :keyword OR vocab.reading ILIKE :keyword OR vocab.definitionCn ILIKE :keyword OR vocab.definitionTc ILIKE :keyword)',
        { keyword: `%${filters.keyword.trim()}%` }
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('vocab.frequency', 'DESC')
      .addOrderBy('vocab.kanji', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
