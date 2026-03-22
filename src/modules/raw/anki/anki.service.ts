import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
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

export interface SrsStats {
  due_today: number;
  learned: number;
  retention_rate: number;
}

export interface VocabImportItem {
  word: string;
  reading?: string | null;
  meaning?: string | null;
  tags?: string[] | null;
}

export interface VocabImportError {
  row: number;
  message: string;
}

export interface VocabImportResult {
  imported: number;
  skipped: number;
  errors: VocabImportError[];
}

export interface ExportedVocabItem {
  word: string;
  reading: string | null;
  meaning: string | null;
  tags: string[];
  review_count: number;
  is_known: boolean;
  added_at: string | null;
  last_reviewed: string | null;
  interval_days: number;
  next_review: string | null;
}

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
type JlptLevel = (typeof JLPT_LEVELS)[number];

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

  async getVocab(jlptLevel?: string): Promise<AnkiVocab[]> {
    const normalizedJlptLevel = jlptLevel
      ? this.normalizeJlptLevel(jlptLevel)
      : null;
    const queryBuilder = this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .leftJoinAndSelect('vocab.sentences', 'sentences');

    if (normalizedJlptLevel) {
      queryBuilder.where('vocab.jlptLevel = :jlptLevel', {
        jlptLevel: normalizedJlptLevel,
      });
    }

    return queryBuilder
      .orderBy('vocab.frequency', 'DESC', 'NULLS LAST')
      .addOrderBy('vocab.reviewCount', 'ASC')
      .addOrderBy('vocab.kanji', 'ASC')
      .getMany();
  }

  async getRandomVocab(jlptLevel?: string, limit = 10): Promise<AnkiVocab[]> {
    const normalizedJlptLevel = jlptLevel
      ? this.normalizeJlptLevel(jlptLevel)
      : null;
    const normalizedLimit = this.normalizeLimit(limit);
    const queryBuilder = this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .leftJoinAndSelect('vocab.sentences', 'sentences');

    if (normalizedJlptLevel) {
      queryBuilder.where('vocab.jlptLevel = :jlptLevel', {
        jlptLevel: normalizedJlptLevel,
      });
    }

    return queryBuilder.orderBy('RANDOM()').take(normalizedLimit).getMany();
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

  async getDueVocab(limit = 20): Promise<AnkiVocab[]> {
    const now = new Date();

    return this.ankiVocabRepository.find({
      where: [{ nextReview: IsNull() }, { nextReview: LessThanOrEqual(now) }],
      relations: ['sentences'],
      order: {
        nextReview: 'ASC',
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
    vocab.lastReviewed = new Date();
    return this.ankiVocabRepository.save(vocab);
  }

  async reviewVocab(noteId: string, known: boolean): Promise<AnkiVocab> {
    if (typeof known !== 'boolean') {
      throw new BadRequestException('"known" must be a boolean');
    }

    const vocab = await this.ankiVocabRepository.findOne({ where: { noteId } });

    if (!vocab) {
      throw new NotFoundException(`Vocab "${noteId}" not found`);
    }

    const now = new Date();
    const intervalDays = known
      ? Math.min((vocab.intervalDays ?? 1) * 2, 365)
      : 1;

    vocab.reviewCount += 1;
    vocab.isKnown = known;
    vocab.intervalDays = intervalDays;
    vocab.lastReviewed = now;
    vocab.nextReview = new Date(
      now.getTime() + intervalDays * 24 * 60 * 60 * 1000,
    );

    return this.ankiVocabRepository.save(vocab);
  }

  async importVocab(
    payload: VocabImportItem[] | string,
    format: 'json' | 'csv',
  ): Promise<VocabImportResult> {
    const errors: VocabImportError[] = [];
    const parsedItems =
      format === 'csv'
        ? this.parseImportCsv(payload)
        : this.parseImportJson(payload);
    const seenWords = new Set<string>();
    const validItems: VocabImportItem[] = [];
    let skipped = 0;

    parsedItems.forEach((item, index) => {
      const row = index + 1;
      const normalized = this.normalizeImportItem(item);

      if (!normalized.word) {
        errors.push({ row, message: 'word is required' });
        return;
      }

      if (seenWords.has(normalized.word)) {
        skipped += 1;
        return;
      }

      seenWords.add(normalized.word);
      validItems.push(normalized);
    });

    if (validItems.length === 0) {
      return { imported: 0, skipped, errors };
    }

    const existing = await this.ankiVocabRepository.find({
      where: { kanji: In(validItems.map((item) => item.word)) },
    });
    const existingWords = new Set(existing.map((item) => item.kanji));

    const newItems = validItems.filter((item) => {
      if (existingWords.has(item.word)) {
        skipped += 1;
        return false;
      }

      return true;
    });

    if (newItems.length === 0) {
      return { imported: 0, skipped, errors };
    }

    const entities = newItems.map((item) => {
      const vocab = new AnkiVocab();
      vocab.kanji = item.word;
      vocab.reading = item.reading ?? null;
      vocab.definitionCn = item.meaning ?? null;
      vocab.tags = item.tags ?? null;
      vocab.reviewCount = 0;
      vocab.isKnown = false;
      vocab.intervalDays = 1;
      vocab.nextReview = null;
      vocab.lastReviewed = null;
      return vocab;
    });

    await this.ankiVocabRepository.save(entities);

    return {
      imported: entities.length,
      skipped,
      errors,
    };
  }

  async exportVocab(
    format: 'json' | 'csv' = 'json',
  ): Promise<ExportedVocabItem[] | string> {
    const vocabList = await this.ankiVocabRepository.find({
      order: {
        addedAt: 'ASC',
        kanji: 'ASC',
      },
    });
    const exported = vocabList.map((item) => this.toExportItem(item));

    if (format === 'csv') {
      return this.buildExportCsv(exported);
    }

    return exported;
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

  async getSrsStats(): Promise<SrsStats> {
    const now = new Date();

    const dueToday = await this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .where(
        new Brackets((qb) => {
          qb.where('vocab.nextReview IS NULL').orWhere(
            'vocab.nextReview <= :now',
            { now },
          );
        }),
      )
      .getCount();

    const learned = await this.ankiVocabRepository.count({
      where: { isKnown: true },
    });

    const reviewed = await this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .where('vocab.reviewCount > 0')
      .getCount();

    return {
      due_today: dueToday,
      learned,
      retention_rate:
        reviewed === 0 ? 0 : Number((learned / reviewed).toFixed(4)),
    };
  }

  private parseImportJson(
    payload: VocabImportItem[] | string,
  ): VocabImportItem[] {
    if (!Array.isArray(payload)) {
      throw new BadRequestException('JSON payload must be an array');
    }

    return payload;
  }

  private parseImportCsv(
    payload: VocabImportItem[] | string,
  ): VocabImportItem[] {
    if (typeof payload !== 'string') {
      throw new BadRequestException('CSV payload must be a string');
    }

    const lines = payload
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return [];
    }

    const [headerLine, ...rows] = lines;
    const headers = this.parseCsvLine(headerLine).map((header) =>
      header.toLowerCase(),
    );

    if (headers.join(',') !== 'word,reading,meaning,tags') {
      throw new BadRequestException(
        'CSV header must be: word,reading,meaning,tags',
      );
    }

    return rows.map((line) => {
      const [word = '', reading = '', meaning = '', tags = ''] =
        this.parseCsvLine(line);
      return {
        word,
        reading,
        meaning,
        tags: this.parseTags(tags),
      };
    });
  }

  private normalizeImportItem(item: VocabImportItem): VocabImportItem {
    const word = typeof item?.word === 'string' ? item.word.trim() : '';
    const reading =
      typeof item?.reading === 'string' ? item.reading.trim() : null;
    const meaning =
      typeof item?.meaning === 'string' ? item.meaning.trim() : null;
    const tags = Array.isArray(item?.tags)
      ? item.tags
          .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter((tag) => tag.length > 0)
      : [];

    return {
      word,
      reading: reading || null,
      meaning: meaning || null,
      tags,
    };
  }

  private parseTags(rawTags: string): string[] {
    if (!rawTags.trim()) {
      return [];
    }

    return rawTags
      .split('|')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  private parseCsvLine(line: string): string[] {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    columns.push(current.trim());
    return columns;
  }

  private toExportItem(item: AnkiVocab): ExportedVocabItem {
    return {
      word: item.kanji,
      reading: item.reading ?? null,
      meaning: item.definitionCn ?? item.definitionTc ?? null,
      tags: item.tags ?? [],
      review_count: item.reviewCount,
      is_known: item.isKnown,
      added_at: item.addedAt ? item.addedAt.toISOString() : null,
      last_reviewed: item.lastReviewed ? item.lastReviewed.toISOString() : null,
      interval_days: item.intervalDays ?? 1,
      next_review: item.nextReview ? item.nextReview.toISOString() : null,
    };
  }

  private buildExportCsv(items: ExportedVocabItem[]): string {
    const header = [
      'word',
      'reading',
      'meaning',
      'tags',
      'review_count',
      'is_known',
      'added_at',
      'last_reviewed',
      'interval_days',
      'next_review',
    ];
    const rows = items.map((item) => [
      item.word,
      item.reading ?? '',
      item.meaning ?? '',
      item.tags.join('|'),
      String(item.review_count),
      String(item.is_known),
      item.added_at ?? '',
      item.last_reviewed ?? '',
      String(item.interval_days),
      item.next_review ?? '',
    ]);

    return [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsvValue(value)).join(','))
      .join('\n');
  }

  private escapeCsvValue(value: string): string {
    if (!/[",\n]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * 根据词性查找词汇列表
   * @param pos 词性，如 "名", "自動3", "他動1" 等
   * @param options 分页选项
   * @returns 分页的词汇列表
   */
  async findByPos(
    pos: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<AnkiVocab>> {
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
  async findByJLPTLevel(
    jlptLevel: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<AnkiVocab>> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    const normalizedJlptLevel = this.normalizeJlptLevel(jlptLevel);

    const [data, total] = await this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .leftJoinAndSelect('vocab.sentences', 'sentences')
      .where('vocab.jlptLevel = :jlptLevel', { jlptLevel: normalizedJlptLevel })
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
      .flatMap((vocab) => vocab.pos || [])
      .filter((pos) => pos && pos.trim().length > 0);

    return [...new Set(allPos)].sort();
  }

  /**
   * 获取所有可用的JLPT等级列表
   * @returns JLPT等级列表
   */
  async getAllJLPTLevels(): Promise<string[]> {
    const result = await this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .select('DISTINCT vocab.jlptLevel', 'jlptLevel')
      .where('vocab.jlptLevel IS NOT NULL')
      .getRawMany<{ jlptLevel: string }>();

    const allJLPT = result
      .map((vocab) => vocab.jlptLevel)
      .filter(
        (jlpt): jlpt is string =>
          typeof jlpt === 'string' && jlpt.trim().length > 0,
      );

    return JLPT_LEVELS.filter((level) => new Set(allJLPT).has(level));
  }

  /**
   * 根据多条件筛选词汇列表
   * @param filters 筛选条件
   * @param options 分页选项
   * @returns 分页的词汇列表
   */
  async findByFilters(
    filters: FilterOptions,
    options: PaginationOptions,
  ): Promise<PaginatedResult<AnkiVocab>> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ankiVocabRepository
      .createQueryBuilder('vocab')
      .leftJoinAndSelect('vocab.sentences', 'sentences');

    // 添加词性筛选条件
    if (filters.pos && filters.pos.length > 0) {
      const posConditions = filters.pos
        .map((_, index) => `:pos${index} = ANY(vocab.pos)`)
        .join(' OR ');
      const posParams = filters.pos.reduce((params, pos, index) => {
        params[`pos${index}`] = pos;
        return params;
      }, {});

      queryBuilder.andWhere(`(${posConditions})`, posParams);
    }

    // 添加JLPT等级筛选条件
    if (filters.jlpt && filters.jlpt.length > 0) {
      const normalizedLevels = filters.jlpt.map((jlpt) =>
        this.normalizeJlptLevel(jlpt),
      );
      const jlptConditions = normalizedLevels
        .map((_, index) => `vocab.jlptLevel = :jlpt${index}`)
        .join(' OR ');
      const jlptParams = normalizedLevels.reduce<Record<string, string>>(
        (params, jlpt, index) => {
          params[`jlpt${index}`] = jlpt;
          return params;
        },
        {},
      );

      queryBuilder.andWhere(`(${jlptConditions})`, jlptParams);
    }

    // 添加关键词搜索条件
    if (filters.keyword && filters.keyword.trim().length > 0) {
      queryBuilder.andWhere(
        '(vocab.kanji ILIKE :keyword OR vocab.reading ILIKE :keyword OR vocab.definitionCn ILIKE :keyword OR vocab.definitionTc ILIKE :keyword)',
        { keyword: `%${filters.keyword.trim()}%` },
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

  private normalizeJlptLevel(level: string): JlptLevel {
    const normalizedLevel = level.trim().toUpperCase() as JlptLevel;

    if (!JLPT_LEVELS.includes(normalizedLevel)) {
      throw new BadRequestException(
        'Query parameter "jlpt" must be one of: N5, N4, N3, N2, N1',
      );
    }

    return normalizedLevel;
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Query parameter "limit" must be an integer between 1 and 100',
      );
    }

    return limit;
  }
}
