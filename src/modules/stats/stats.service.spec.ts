import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatsService } from './stats.service';
import { AnkiVocab } from '../raw/entities/anki-vocab.entity';

describe('StatsService', () => {
  let service: StatsService;
  let repository: jest.Mocked<Repository<AnkiVocab>>;

  const createQueryBuilder = () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
    };

    return builder;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: getRepositoryToken(AnkiVocab),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(StatsService);
    repository = module.get(getRepositoryToken(AnkiVocab));
  });

  it('getLearningProgress returns jlpt buckets and fills missing levels with zeros', async () => {
    const builder = createQueryBuilder();
    repository.createQueryBuilder.mockReturnValue(builder as never);
    builder.getRawMany.mockResolvedValue([
      { jlptLevel: 'N5', total: '100', learned: '45' },
      { jlptLevel: 'N4', total: '80', learned: '20' },
    ]);

    await expect(service.getLearningProgress()).resolves.toEqual({
      N5: { total: 100, learned: 45 },
      N4: { total: 80, learned: 20 },
      N3: { total: 0, learned: 0 },
      N2: { total: 0, learned: 0 },
      N1: { total: 0, learned: 0 },
    });

    expect(builder.where).toHaveBeenCalledWith('v.jlptLevel IS NOT NULL');
    expect(builder.groupBy).toHaveBeenCalledWith('v.jlptLevel');
  });

  it('getLearningStreak counts consecutive utc review days including today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-22T12:00:00.000Z'));
    const builder = createQueryBuilder();
    repository.createQueryBuilder.mockReturnValue(builder as never);
    builder.getRawMany.mockResolvedValue([
      { reviewDate: '2026-03-22' },
      { reviewDate: '2026-03-21' },
      { reviewDate: '2026-03-20' },
      { reviewDate: '2026-03-18' },
    ]);

    await expect(service.getLearningStreak()).resolves.toEqual({ streak: 3 });

    expect(builder.where).toHaveBeenCalledWith('v.lastReviewed IS NOT NULL');
    expect(builder.orderBy).toHaveBeenCalledWith('reviewDate', 'DESC');
    jest.useRealTimers();
  });

  it('getLearningStreak counts from yesterday when today has no reviews', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-22T12:00:00.000Z'));
    const builder = createQueryBuilder();
    repository.createQueryBuilder.mockReturnValue(builder as never);
    builder.getRawMany.mockResolvedValue([
      { reviewDate: '2026-03-21' },
      { reviewDate: '2026-03-20' },
      { reviewDate: '2026-03-18' },
    ]);

    await expect(service.getLearningStreak()).resolves.toEqual({ streak: 2 });
    jest.useRealTimers();
  });

  it('getLearningStreak returns zero when the streak is broken before yesterday', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-22T12:00:00.000Z'));
    const builder = createQueryBuilder();
    repository.createQueryBuilder.mockReturnValue(builder as never);
    builder.getRawMany.mockResolvedValue([{ reviewDate: '2026-03-19' }]);

    await expect(service.getLearningStreak()).resolves.toEqual({ streak: 0 });
    jest.useRealTimers();
  });
});
