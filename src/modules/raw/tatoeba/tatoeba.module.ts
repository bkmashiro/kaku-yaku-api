import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TatoebaService } from './tatoeba.service';
import { TatoebaSentence } from '../entities/tatoeba-sentence.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TatoebaSentence]),
  ],
  providers: [TatoebaService],
  exports: [TatoebaService],
})
export class TatoebaModule {} 