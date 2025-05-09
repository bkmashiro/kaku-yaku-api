import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createReadStream } from 'fs';
import { KanjiDict } from '../entities/kanji-dict.entity';
import { JMDict } from '../entities/jm-dict.entity';
import { TatoebaSentence } from '../entities/tatoeba-sentence.entity';
import { KanjiDictParser } from './helpers/kanji-dict';
import { JMDictParser } from './helpers/jm-dict-parser';
import { TatoebaParser } from './helpers/tatoeba-parser';

@Injectable()
export class DataLoaderService {
  private readonly logger = new Logger(DataLoaderService.name);
  private readonly kanjiDictParser: KanjiDictParser;
  private readonly jmDictParser: JMDictParser;
  private readonly tatoebaParser: TatoebaParser;

  constructor(
    @InjectRepository(KanjiDict)
    private kanjiDictRepository: Repository<KanjiDict>,
    @InjectRepository(JMDict)
    private jmDictRepository: Repository<JMDict>,
    @InjectRepository(TatoebaSentence)
    private tatoebaSentenceRepository: Repository<TatoebaSentence>,
    private configService: ConfigService,
  ) {
    this.kanjiDictParser = new KanjiDictParser();
    this.jmDictParser = new JMDictParser();
    this.tatoebaParser = new TatoebaParser();
  }

  async loadAllData() {
    await this.loadKanjiDict();
    await this.loadJMDict();
    await this.loadTatoebaSentences();
  }

  /**
   * Load kanji dictionary data from XML file
   * @param filePath Path to the KANJIDIC2 XML file
   */
  async loadKanjiDict(filePath?: string): Promise<void> {
    const shouldLoad = this.configService.get('LOAD_KANJI_DICT') === 'true';
    if (!shouldLoad) {
      this.logger.log('Skipping KanjiDict data loading as per configuration');
      return;
    }

    const path = filePath || this.configService.get('KANJI_DICT_PATH');
    if (!path) {
      throw new Error('KANJI_DICT_PATH is not configured');
    }

    this.logger.log(`Loading kanji dictionary from ${path}`);

    // clear the table
    await this.kanjiDictRepository.clear();
    this.logger.warn('Cleared KanjiDict table');
    const stream = createReadStream(path);

    try {
      const kanjiDicts = await this.kanjiDictParser.parseStream(stream);

      // Use batch insert for better performance
      const batchSize = 1000;
      for (let i = 0; i < kanjiDicts.length; i += batchSize) {
        this.logger.debug(
          `Loading kanji dictionary: ${i + 1} of ${kanjiDicts.length}`,
        );
        const batch = kanjiDicts.slice(i, i + batchSize);
        await this.kanjiDictRepository.save(batch);
      }
    } catch (error) {
      this.logger.error('Error loading kanji dictionary:', error);
      throw error;
    }
  }

  /**
   * Load JMdict data from XML file
   * @param filePath Path to the JMdict XML file
   */
  async loadJMDict(filePath?: string): Promise<void> {
    const shouldLoad = this.configService.get('LOAD_JM_DICT') === 'true';
    if (!shouldLoad) {
      this.logger.log('Skipping JMDict data loading as per configuration');
      return;
    }

    const path = filePath || this.configService.get('JM_DICT_PATH');
    if (!path) {
      throw new Error('JM_DICT_PATH is not configured');
    }

    this.logger.log(`Loading JMdict from ${path}`);

    // clear the table
    await this.jmDictRepository.clear();
    this.logger.warn('Cleared JMdict table');

    const stream = createReadStream(path);
    const transform = this.jmDictParser.createTransformStream();

    // 批量处理
    const batchSize = 1000;
    let batch: JMDict[] = [];
    let totalProcessed = 0;
    let isProcessing = false;

    return new Promise((resolve, reject) => {
      // 处理批次的函数
      const processBatch = async () => {
        if (isProcessing || batch.length === 0) return;
        
        isProcessing = true;
        const currentBatch = [...batch];
        batch = [];

        try {
          await this.jmDictRepository.save(currentBatch);
          totalProcessed += currentBatch.length;
          this.logger.debug(`Processed ${totalProcessed} entries`);
        } catch (error) {
          reject(error);
          return;
        }

        isProcessing = false;
        // 如果还有数据，继续处理
        if (batch.length >= batchSize) {
          processBatch();
        }
      };

      transform.on('data', (jmDict: JMDict) => {
        batch.push(jmDict);
        
        if (batch.length >= batchSize) {
          // 暂停读取流
          stream.pause();
          processBatch().then(() => {
            // 处理完批次后恢复读取
            stream.resume();
          });
        }
      });

      transform.on('end', async () => {
        try {
          // 保存剩余的批次
          if (batch.length > 0) {
            await this.jmDictRepository.save(batch);
            this.logger.debug(`Processed final ${batch.length} entries`);
            totalProcessed += batch.length;
          }
          this.logger.log(`Completed loading JMdict, total entries: ${totalProcessed}`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      transform.on('error', (error) => {
        reject(error);
      });

      stream.pipe(transform);
    });
  }

  /**
   * 加载 Tatoeba 例句数据
   * @param filePath Tatoeba TSV 文件路径
   */
  async loadTatoebaSentences(filePath?: string): Promise<void> {
    const shouldLoad = this.configService.get('LOAD_TATOEBA') === 'true';
    if (!shouldLoad) {
      this.logger.log('Skipping Tatoeba data loading as per configuration');
      return;
    }

    const path = filePath || this.configService.get('TATOEBA_PATH');
    if (!path) {
      throw new Error('TATOEBA_PATH is not configured');
    }

    this.logger.log(`Loading Tatoeba sentences from ${path}`);

    // 清空表
    await this.tatoebaSentenceRepository.clear();
    this.logger.warn('Cleared Tatoeba sentences table');

    const stream = createReadStream(path);
    const transform = this.tatoebaParser.createTransformStream();

    const batchSize = 1000;
    let batch: TatoebaSentence[] = [];
    let totalProcessed = 0;

    return new Promise((resolve, reject) => {
      const processBatch = async () => {
        if (batch.length === 0) return;

        const currentBatch = [...batch];
        batch = [];

        try {
          // 使用 insert 而不是 save 来提高性能
          await this.tatoebaSentenceRepository
            .createQueryBuilder()
            .insert()
            .into(TatoebaSentence)
            .values(currentBatch)
            .execute();

          totalProcessed += currentBatch.length;
          this.logger.debug(`Processed ${totalProcessed} sentences`);
        } catch (error) {
          this.logger.error('Error saving batch:', error);
          reject(error);
        }
      };

      transform.on('data', async (sentence: TatoebaSentence) => {
        batch.push(sentence);
        
        if (batch.length >= batchSize) {
          // 暂停流
          stream.pause();
          await processBatch();
          // 恢复流
          stream.resume();
        }
      });

      transform.on('end', async () => {
        try {
          // 处理剩余的批次
          if (batch.length > 0) {
            await processBatch();
          }
          this.logger.log(`Completed loading Tatoeba sentences, total: ${totalProcessed}`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      transform.on('error', (error) => {
        this.logger.error('Transform stream error:', error);
        reject(error);
      });

      stream.on('error', (error) => {
        this.logger.error('Read stream error:', error);
        reject(error);
      });

      stream.pipe(transform);
    });
  }

  private processArrayValue(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(v => v !== null && v !== undefined && v !== '');
    }
    return [value].filter(v => v !== null && v !== undefined && v !== '');
  }
}
