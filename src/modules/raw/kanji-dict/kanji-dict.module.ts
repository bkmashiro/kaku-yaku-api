import { Module } from '@nestjs/common';
import { KanjiDictService } from './kanji-dict.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanjiDict } from '../entities/kanji-dict.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KanjiDict])],
  providers: [KanjiDictService],
  exports: [KanjiDictService]
})
export class KanjiDictModule {}
