import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnkiVocab } from '../raw/entities/anki-vocab.entity';

export interface VocabStats {
  total: number;
  reviewed: number;
  known: number;
  topWords: { word: string; reading: string; review_count: number }[];
  recentWords: { word: string; reading: string; added_at: Date }[];
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(AnkiVocab)
    private ankiVocabRepository: Repository<AnkiVocab>,
  ) {}

  async getVocabStats(): Promise<VocabStats> {
    const [total, reviewed, known, topWords, recentWords] = await Promise.all([
      this.ankiVocabRepository.count(),

      this.ankiVocabRepository
        .createQueryBuilder('v')
        .where('v.reviewCount > 0')
        .getCount(),

      this.ankiVocabRepository
        .createQueryBuilder('v')
        .where('v.isKnown = true')
        .getCount(),

      this.ankiVocabRepository
        .createQueryBuilder('v')
        .select(['v.kanji', 'v.reading', 'v.reviewCount'])
        .orderBy('v.reviewCount', 'DESC')
        .limit(10)
        .getMany(),

      this.ankiVocabRepository
        .createQueryBuilder('v')
        .select(['v.kanji', 'v.reading', 'v.addedAt'])
        .orderBy('v.addedAt', 'DESC')
        .limit(10)
        .getMany(),
    ]);

    return {
      total,
      reviewed,
      known,
      topWords: topWords.map((v) => ({
        word: v.kanji,
        reading: v.reading,
        review_count: v.reviewCount,
      })),
      recentWords: recentWords.map((v) => ({
        word: v.kanji,
        reading: v.reading,
        added_at: v.addedAt,
      })),
    };
  }
}
