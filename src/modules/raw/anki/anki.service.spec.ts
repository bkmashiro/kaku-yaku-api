import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { AnkiService } from './anki.service';
import { AnkiVocab } from '../entities/anki-vocab.entity';

describe('AnkiService', () => {
  let service: AnkiService;
  let repository: jest.Mocked<Repository<AnkiVocab>>;

  const createQueryBuilder = () => {
    const builder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      select: jest.fn().mockReturnThis(),
      cache: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };

    return builder;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnkiService,
        {
          provide: getRepositoryToken(AnkiVocab),
          useValue: {
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AnkiService);
    repository = module.get(getRepositoryToken(AnkiVocab));
  });

  it('searchVocab rejects empty queries', async () => {
    await expect(service.searchVocab('   ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('searchVocab queries vocab fields and returns matches', async () => {
    const builder = createQueryBuilder();
    repository.createQueryBuilder.mockReturnValue(builder as never);
    builder.getMany.mockResolvedValue([{ noteId: '1' }]);

    const result = await service.searchVocab('猫');

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('vocab');
    expect(builder.where).toHaveBeenCalledWith(
      '(vocab.kanji ILIKE :keyword OR vocab.reading ILIKE :keyword OR vocab.definitionCn ILIKE :keyword OR vocab.definitionTc ILIKE :keyword)',
      { keyword: '%猫%' },
    );
    expect(result).toEqual([{ noteId: '1' }]);
  });

  it('getReviewVocab returns 20 unknown vocab ordered by review count', async () => {
    repository.find.mockResolvedValue([{ noteId: '2' }] as AnkiVocab[]);

    const result = await service.getReviewVocab();

    expect(repository.find).toHaveBeenCalledWith({
      where: { isKnown: false },
      relations: ['sentences'],
      order: {
        reviewCount: 'ASC',
        addedAt: 'ASC',
      },
      take: 20,
    });
    expect(result).toEqual([{ noteId: '2' }]);
  });

  it('markReviewed increments reviewCount and saves', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
    repository.findOne.mockResolvedValue({ noteId: '3', reviewCount: 1 } as AnkiVocab);
    repository.save.mockResolvedValue({
      noteId: '3',
      reviewCount: 2,
      lastReviewed: new Date('2026-03-21T10:00:00.000Z'),
    } as AnkiVocab);

    const result = await service.markReviewed('3');

    expect(repository.save).toHaveBeenCalledWith({
      noteId: '3',
      reviewCount: 2,
      lastReviewed: new Date('2026-03-21T10:00:00.000Z'),
    });
    expect(result.reviewCount).toBe(2);
    expect(result.lastReviewed).toEqual(new Date('2026-03-21T10:00:00.000Z'));
    jest.useRealTimers();
  });

  it('markReviewed throws when vocab does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.markReviewed('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getDueVocab returns vocab with empty or overdue nextReview', async () => {
    repository.find.mockResolvedValue([{ noteId: 'due-1' }] as AnkiVocab[]);

    const result = await service.getDueVocab();

    expect(repository.find).toHaveBeenCalledWith({
      where: expect.any(Array),
      relations: ['sentences'],
      order: {
        nextReview: 'ASC',
        reviewCount: 'ASC',
        addedAt: 'ASC',
      },
      take: 20,
    });
    expect(result).toEqual([{ noteId: 'due-1' }]);
  });

  it('reviewVocab doubles interval and schedules next review when known', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
    repository.findOne.mockResolvedValue({
      noteId: 'known-1',
      reviewCount: 2,
      intervalDays: 4,
      isKnown: false,
      nextReview: null,
    } as AnkiVocab);
    repository.save.mockImplementation(async (value) => value as AnkiVocab);

    const result = await service.reviewVocab('known-1', true);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: 'known-1',
        reviewCount: 3,
        intervalDays: 8,
        isKnown: true,
        lastReviewed: new Date('2026-03-21T10:00:00.000Z'),
        nextReview: new Date('2026-03-29T10:00:00.000Z'),
      }),
    );
    expect(result.intervalDays).toBe(8);
    expect(result.nextReview).toEqual(new Date('2026-03-29T10:00:00.000Z'));
    jest.useRealTimers();
  });

  it('reviewVocab resets interval to one day when unknown', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
    repository.findOne.mockResolvedValue({
      noteId: 'unknown-1',
      reviewCount: 5,
      intervalDays: 16,
      isKnown: true,
      nextReview: null,
    } as AnkiVocab);
    repository.save.mockImplementation(async (value) => value as AnkiVocab);

    const result = await service.reviewVocab('unknown-1', false);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: 'unknown-1',
        reviewCount: 6,
        intervalDays: 1,
        isKnown: false,
        lastReviewed: new Date('2026-03-21T10:00:00.000Z'),
        nextReview: new Date('2026-03-22T10:00:00.000Z'),
      }),
    );
    expect(result.intervalDays).toBe(1);
    expect(result.nextReview).toEqual(new Date('2026-03-22T10:00:00.000Z'));
    jest.useRealTimers();
  });

  it('reviewVocab rejects non-boolean known values', async () => {
    await expect(service.reviewVocab('bad-1', undefined as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reviewVocab throws when vocab does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.reviewVocab('missing', true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('markKnown sets isKnown to true', async () => {
    repository.findOne.mockResolvedValue({ noteId: '4', isKnown: false } as AnkiVocab);
    repository.save.mockResolvedValue({ noteId: '4', isKnown: true } as AnkiVocab);

    const result = await service.markKnown('4');

    expect(repository.save).toHaveBeenCalledWith({ noteId: '4', isKnown: true });
    expect(result.isKnown).toBe(true);
  });

  it('deleteVocab deletes by noteId', async () => {
    repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

    await expect(service.deleteVocab('5')).resolves.toBeUndefined();

    expect(repository.delete).toHaveBeenCalledWith({ noteId: '5' });
  });

  it('deleteVocab throws when vocab does not exist', async () => {
    repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

    await expect(service.deleteVocab('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getSrsStats returns due count, learned count, and retention rate', async () => {
    const dueBuilder = createQueryBuilder();
    const reviewedBuilder = createQueryBuilder();
    repository.createQueryBuilder
      .mockReturnValueOnce(dueBuilder as never)
      .mockReturnValueOnce(reviewedBuilder as never);
    dueBuilder.getCount.mockResolvedValue(3);
    reviewedBuilder.getCount.mockResolvedValue(8);
    repository.count.mockResolvedValue(4);

    await expect(service.getSrsStats()).resolves.toEqual({
      due_today: 3,
      learned: 4,
      retention_rate: 0.5,
    });

    expect(repository.count).toHaveBeenCalledWith({ where: { isKnown: true } });
    expect(reviewedBuilder.where).toHaveBeenCalledWith('vocab.reviewCount > 0');
  });

  it('importVocab imports JSON vocab, skips duplicates, and reports errors', async () => {
    repository.find.mockResolvedValue([{ kanji: '犬' }] as AnkiVocab[]);
    repository.save.mockImplementation(async (value) => value as never);

    await expect(
      service.importVocab(
        [
          { word: '猫', reading: 'ねこ', meaning: 'cat', tags: ['animal', ' pet '] },
          { word: '猫', reading: 'ねこ', meaning: 'duplicate' },
          { word: '犬', reading: 'いぬ', meaning: 'dog' },
          { word: '  ', reading: 'blank', meaning: 'invalid' },
        ],
        'json',
      ),
    ).resolves.toEqual({
      imported: 1,
      skipped: 2,
      errors: [{ row: 4, message: 'word is required' }],
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: { kanji: expect.anything() },
    });
    expect(repository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        kanji: '猫',
        reading: 'ねこ',
        definitionCn: 'cat',
        tags: ['animal', 'pet'],
        reviewCount: 0,
        isKnown: false,
        intervalDays: 1,
        nextReview: null,
        lastReviewed: null,
      }),
    ]);
  });

  it('importVocab parses CSV payload and imports rows', async () => {
    repository.find.mockResolvedValue([]);
    repository.save.mockImplementation(async (value) => value as never);

    const result = await service.importVocab(
      'word,reading,meaning,tags\n"勉強","べんきょう","study, practice","jlpt-n5|school"',
      'csv',
    );

    expect(result).toEqual({
      imported: 1,
      skipped: 0,
      errors: [],
    });
    expect(repository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        kanji: '勉強',
        reading: 'べんきょう',
        definitionCn: 'study, practice',
        tags: ['jlpt-n5', 'school'],
      }),
    ]);
  });

  it('exportVocab returns JSON rows with SRS fields', async () => {
    repository.find.mockResolvedValue([
      {
        kanji: '猫',
        reading: 'ねこ',
        definitionCn: 'cat',
        tags: ['animal'],
        reviewCount: 3,
        isKnown: true,
        addedAt: new Date('2026-03-20T10:00:00.000Z'),
        lastReviewed: new Date('2026-03-21T09:00:00.000Z'),
        intervalDays: 4,
        nextReview: new Date('2026-03-25T09:00:00.000Z'),
      },
    ] as AnkiVocab[]);

    await expect(service.exportVocab('json')).resolves.toEqual([
      {
        word: '猫',
        reading: 'ねこ',
        meaning: 'cat',
        tags: ['animal'],
        review_count: 3,
        is_known: true,
        added_at: '2026-03-20T10:00:00.000Z',
        last_reviewed: '2026-03-21T09:00:00.000Z',
        interval_days: 4,
        next_review: '2026-03-25T09:00:00.000Z',
      },
    ]);
  });

  it('exportVocab returns CSV rows with escaped values', async () => {
    repository.find.mockResolvedValue([
      {
        kanji: '勉強',
        reading: 'べんきょう',
        definitionCn: 'study, "practice"',
        tags: ['jlpt-n5', 'school'],
        reviewCount: 1,
        isKnown: false,
        addedAt: new Date('2026-03-20T10:00:00.000Z'),
        lastReviewed: null,
        intervalDays: 1,
        nextReview: null,
      },
    ] as AnkiVocab[]);

    await expect(service.exportVocab('csv')).resolves.toBe(
      'word,reading,meaning,tags,review_count,is_known,added_at,last_reviewed,interval_days,next_review\n' +
        '勉強,べんきょう,"study, ""practice""",jlpt-n5|school,1,false,2026-03-20T10:00:00.000Z,,1,',
    );
  });
});
