import { Module } from '@nestjs/common';
import { RawService } from './raw.service';
import { DataLoaderService } from './data-loader/data-loader.service';
import { KanjiDict } from './entities/kanji-dict.entity';
import { JMDict } from './entities/jm-dict.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([KanjiDict, JMDict]),
    ConfigModule,
  ],
  providers: [RawService, DataLoaderService],
})
export class RawModule {}
