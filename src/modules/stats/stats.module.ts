import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnkiVocab } from '../raw/entities/anki-vocab.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnkiVocab])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
