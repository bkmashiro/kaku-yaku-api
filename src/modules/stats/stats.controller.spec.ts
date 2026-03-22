import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

describe('StatsController', () => {
  let controller: StatsController;
  const statsService = {
    getVocabStats: jest.fn(),
    getLearningProgress: jest.fn(),
    getLearningStreak: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: StatsService,
          useValue: statsService,
        },
      ],
    }).compile();

    controller = moduleFixture.get(StatsController);
  });

  it('getVocabStats delegates to the service', async () => {
    statsService.getVocabStats.mockResolvedValue({
      total: 10,
      reviewed: 5,
      known: 3,
      topWords: [],
      recentWords: [],
    });

    await expect(controller.getVocabStats()).resolves.toEqual({
      total: 10,
      reviewed: 5,
      known: 3,
      topWords: [],
      recentWords: [],
    });
    expect(statsService.getVocabStats).toHaveBeenCalledTimes(1);
  });

  it('getLearningProgress delegates to the service', async () => {
    statsService.getLearningProgress.mockResolvedValue({
      N5: { total: 100, learned: 45 },
      N4: { total: 80, learned: 20 },
      N3: { total: 0, learned: 0 },
      N2: { total: 0, learned: 0 },
      N1: { total: 0, learned: 0 },
    });

    await expect(controller.getLearningProgress()).resolves.toEqual({
      N5: { total: 100, learned: 45 },
      N4: { total: 80, learned: 20 },
      N3: { total: 0, learned: 0 },
      N2: { total: 0, learned: 0 },
      N1: { total: 0, learned: 0 },
    });
    expect(statsService.getLearningProgress).toHaveBeenCalledTimes(1);
  });

  it('getStreak delegates to the service', async () => {
    statsService.getLearningStreak.mockResolvedValue({ streak: 4 });

    await expect(controller.getStreak()).resolves.toEqual({ streak: 4 });
    expect(statsService.getLearningStreak).toHaveBeenCalledTimes(1);
  });
});
