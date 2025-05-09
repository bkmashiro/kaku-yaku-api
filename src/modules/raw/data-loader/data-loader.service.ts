import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanjiDict } from '../entities/kanji-dict.entity';
import { KanjiDictParser } from './helpers/kanji-dict';
import { createReadStream } from 'fs';

const logger = new Logger('DataLoaderService');

@Injectable()
export class DataLoaderService {
  constructor(
    @InjectRepository(KanjiDict)
    private readonly kanjiDictRepository: Repository<KanjiDict>,
  ) {}

  /**
   * Load kanji dictionary data from XML file
   * @param filePath Path to the KANJIDIC2 XML file
   */
  async loadKanjiDict(filePath: string): Promise<void> {
    logger.log(`Loading kanji dictionary from ${filePath}`);

    // clear the table
    await this.kanjiDictRepository.clear();

    const parser = new KanjiDictParser();
    const stream = createReadStream(filePath);

    try {
      const kanjiDicts = await parser.parseStream(stream);

      // Use batch insert for better performance
      const batchSize = 1000;
      for (let i = 0; i < kanjiDicts.length; i += batchSize) {
        logger.log(
          `Loading kanji dictionary: ${i + 1} of ${kanjiDicts.length}`,
        );
        const batch = kanjiDicts.slice(i, i + batchSize);
        await this.kanjiDictRepository.save(batch);
      }
    } catch (error) {
      console.error('Error loading kanji dictionary:', error);
      throw error;
    }
  }
}
