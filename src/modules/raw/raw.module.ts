import { Module } from '@nestjs/common';
import { RawService } from './raw.service';
import { DataLoaderService } from './data-loader/data-loader.service';
import { KanjiDict } from './entities/kanji-dict.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([KanjiDict])],
  providers: [RawService, DataLoaderService],
})
export class RawModule {}
