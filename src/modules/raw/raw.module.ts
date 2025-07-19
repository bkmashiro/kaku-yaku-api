import { Module } from '@nestjs/common';
import { RawService } from './raw.service';
import { DataLoaderService } from './data-loader/data-loader.service';
import { KanjiDict } from './entities/kanji-dict.entity';
import { JMDict } from './entities/jm-dict.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TatoebaSentence } from './entities/tatoeba-sentence.entity';
import { TatoebaModule } from './tatoeba/tatoeba.module';
import { JmDictModule } from './jm-dict/jm-dict.module';
import { KanjiDictModule } from './kanji-dict/kanji-dict.module';
import { AnkiModule } from './anki/anki.module';
import { AnkiVocab } from './entities/anki-vocab.entity';
import { AnkiSentence } from './entities/anki-sentence.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KanjiDict, JMDict, TatoebaSentence, AnkiVocab, AnkiSentence]),
    ConfigModule,
    TatoebaModule,
    JmDictModule,
    KanjiDictModule,
    AnkiModule,
  ],
  providers: [RawService, DataLoaderService],
  exports: [
    DataLoaderService, 
    TatoebaModule,
    JmDictModule,
    KanjiDictModule,
    RawService,
  ],
})
export class RawModule {}
