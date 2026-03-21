import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { VocabController } from './vocab.controller';
import { AnkiService } from './anki.service';

describe('VocabController', () => {
  let controller: VocabController;
  const ankiService = {
    searchVocab: jest.fn(),
    getReviewVocab: jest.fn(),
    getDueVocab: jest.fn(),
    getSrsStats: jest.fn(),
    importVocab: jest.fn(),
    exportVocab: jest.fn(),
    reviewVocab: jest.fn(),
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

  it('due returns due vocab from the service', async () => {
    ankiService.getDueVocab.mockResolvedValue([{ noteId: 'due-1', kanji: '鳥' }]);

    await expect(controller.due()).resolves.toEqual([{ noteId: 'due-1', kanji: '鳥' }]);
    expect(ankiService.getDueVocab).toHaveBeenCalledTimes(1);
  });

  it('getSrsStats returns stats from the service', async () => {
    ankiService.getSrsStats.mockResolvedValue({
      due_today: 3,
      learned: 10,
      retention_rate: 0.5,
    });

    await expect(controller.getSrsStats()).resolves.toEqual({
      due_today: 3,
      learned: 10,
      retention_rate: 0.5,
    });
    expect(ankiService.getSrsStats).toHaveBeenCalledTimes(1);
  });

  it('importVocab delegates payload format based on content type', async () => {
    ankiService.importVocab.mockResolvedValue({ imported: 1, skipped: 0, errors: [] });

    await expect(controller.importVocab('word,reading,meaning,tags', 'text/csv')).resolves.toEqual({
      imported: 1,
      skipped: 0,
      errors: [],
    });
    expect(ankiService.importVocab).toHaveBeenCalledWith('word,reading,meaning,tags', 'csv');
  });

  it('exportVocab sets CSV header and delegates format', async () => {
    const response = {
      setHeader: jest.fn(),
    } as unknown as Response;
    ankiService.exportVocab.mockResolvedValue('csv-content');

    await expect(controller.exportVocab('csv', response)).resolves.toBe('csv-content');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(ankiService.exportVocab).toHaveBeenCalledWith('csv');
  });

  it('reviewResult delegates note id and known flag', async () => {
    ankiService.reviewVocab.mockResolvedValue({ noteId: 'review-1', intervalDays: 2 });

    await expect(controller.reviewResult('review-1', { known: true })).resolves.toEqual({
      noteId: 'review-1',
      intervalDays: 2,
    });
    expect(ankiService.reviewVocab).toHaveBeenCalledWith('review-1', true);
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
