import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnkiService } from './anki.service';
import { AnkiController } from './anki.controller';
import { AnkiVocab } from '../entities/anki-vocab.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnkiVocab])],
  controllers: [AnkiController],
  providers: [AnkiService],
  exports: [AnkiService]
})
export class AnkiModule {}
