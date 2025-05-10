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

@Module({
  imports: [
    TypeOrmModule.forFeature([KanjiDict, JMDict, TatoebaSentence]),
    ConfigModule,
    TatoebaModule,
    JmDictModule,
    KanjiDictModule,
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
