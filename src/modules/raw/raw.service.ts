import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataLoaderService } from './data-loader/data-loader.service';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RawService implements OnModuleInit {
  constructor(
    private readonly dataLoaderService: DataLoaderService,
    private readonly configService: ConfigService,
  ) {}

  dataPath = join(__dirname, '..', '..', '..', 'data');

  async onModuleInit() {
    // 检查是否需要加载汉字字典数据
    const shouldLoadKanjiDict = this.configService.get<boolean>('LOAD_KANJI_DICT');
    if (shouldLoadKanjiDict) {
      await this.loadKanjiDict();
    }
  }

  async loadKanjiDict() {
    await this.dataLoaderService.loadKanjiDict(
      join(this.dataPath, 'kanji-dict', 'kanjidic2.xml'),
    );
  }
}
