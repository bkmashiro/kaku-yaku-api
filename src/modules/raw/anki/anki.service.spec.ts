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
    repository.findOne.mockResolvedValue({ noteId: '3', reviewCount: 1 } as AnkiVocab);
    repository.save.mockResolvedValue({ noteId: '3', reviewCount: 2 } as AnkiVocab);

    const result = await service.markReviewed('3');

    expect(repository.save).toHaveBeenCalledWith({ noteId: '3', reviewCount: 2 });
    expect(result.reviewCount).toBe(2);
  });

  it('markReviewed throws when vocab does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.markReviewed('missing')).rejects.toBeInstanceOf(NotFoundException);
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
});
