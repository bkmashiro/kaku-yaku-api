import { Injectable } from '@nestjs/common';
import { DataLoaderService } from './data-loader/data-loader.service';
import { join } from 'path';

@Injectable()
export class RawService {
  constructor(private readonly dataLoaderService: DataLoaderService) {
    this.loadKanjiDict();
  }

  dataPath = join(__dirname, '..', '..', '..', 'data');

  async loadKanjiDict() {
    await this.dataLoaderService.loadKanjiDict(
      join(this.dataPath, 'kanji-dict', 'kanjidic2.xml'),
    );
  }
}
