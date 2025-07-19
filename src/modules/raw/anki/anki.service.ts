import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AnkiService {
  constructor(
    @InjectRepository(AnkiVocab)
    private ankiVocabRepository: Repository<AnkiVocab>,
  ) {}

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
}
