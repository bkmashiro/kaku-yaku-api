import { Test, TestingModule } from '@nestjs/testing';
import { VocabController } from './vocab.controller';
import { AnkiService } from './anki.service';

describe('VocabController', () => {
  let controller: VocabController;
  const ankiService = {
    searchVocab: jest.fn(),
    getReviewVocab: jest.fn(),
    markReviewed: jest.fn(),
    markKnown: jest.fn(),
    deleteVocab: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VocabController],
      providers: [
        {
          provide: AnkiService,
          useValue: ankiService,
        },
      ],
    }).compile();

    controller = moduleFixture.get(VocabController);
  });

  it('search delegates query to the service', async () => {
    ankiService.searchVocab.mockResolvedValue([{ noteId: '1', kanji: '猫' }]);

    await expect(controller.search('猫')).resolves.toEqual([{ noteId: '1', kanji: '猫' }]);
    expect(ankiService.searchVocab).toHaveBeenCalledWith('猫');
  });

  it('review returns review vocab from the service', async () => {
    ankiService.getReviewVocab.mockResolvedValue([{ noteId: '2', kanji: '犬' }]);

    await expect(controller.review()).resolves.toEqual([{ noteId: '2', kanji: '犬' }]);
    expect(ankiService.getReviewVocab).toHaveBeenCalledTimes(1);
  });

  it('markReviewed delegates note id', async () => {
    ankiService.markReviewed.mockResolvedValue({ noteId: '3', reviewCount: 2 });

    await expect(controller.markReviewed('3')).resolves.toEqual({ noteId: '3', reviewCount: 2 });
    expect(ankiService.markReviewed).toHaveBeenCalledWith('3');
  });

  it('markKnown delegates note id', async () => {
    ankiService.markKnown.mockResolvedValue({ noteId: '4', isKnown: true });

    await expect(controller.markKnown('4')).resolves.toEqual({ noteId: '4', isKnown: true });
    expect(ankiService.markKnown).toHaveBeenCalledWith('4');
  });

  it('remove delegates note id', async () => {
    ankiService.deleteVocab.mockResolvedValue(undefined);

    await expect(controller.remove('5')).resolves.toBeUndefined();
    expect(ankiService.deleteVocab).toHaveBeenCalledWith('5');
  });
});
