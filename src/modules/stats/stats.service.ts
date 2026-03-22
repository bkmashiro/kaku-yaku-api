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

export interface LearningProgressStats {
  total: number;
  learned: number;
}

export type LearningProgressResponse = Record<
  'N5' | 'N4' | 'N3' | 'N2' | 'N1',
  LearningProgressStats
>;

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

  async getLearningProgress(): Promise<LearningProgressResponse> {
    const rows = await this.ankiVocabRepository
      .createQueryBuilder('v')
      .select('v.jlptLevel', 'jlptLevel')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN v.isKnown = true THEN 1 ELSE 0 END)', 'learned')
      .where('v.jlptLevel IS NOT NULL')
      .groupBy('v.jlptLevel')
      .getRawMany<{
        jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
        total: string;
        learned: string;
      }>();

    const progress: LearningProgressResponse = {
      N5: { total: 0, learned: 0 },
      N4: { total: 0, learned: 0 },
      N3: { total: 0, learned: 0 },
      N2: { total: 0, learned: 0 },
      N1: { total: 0, learned: 0 },
    };

    rows.forEach((row) => {
      progress[row.jlptLevel] = {
        total: Number(row.total),
        learned: Number(row.learned),
      };
    });

    return progress;
  }

  async getLearningStreak(): Promise<{ streak: number }> {
    const rows = await this.ankiVocabRepository
      .createQueryBuilder('v')
      .select("DISTINCT DATE(v.lastReviewed AT TIME ZONE 'UTC')", 'reviewDate')
      .where('v.lastReviewed IS NOT NULL')
      .orderBy('reviewDate', 'DESC')
      .getRawMany<{ reviewDate: string }>();

    const streak = this.calculateStreak(rows.map((row) => row.reviewDate));
    return { streak };
  }

  private calculateStreak(reviewDates: string[]): number {
    if (reviewDates.length === 0) {
      return 0;
    }

    let streak = 0;
    let expectedDate = this.toUtcDateOnly(new Date());

    if (reviewDates[0] !== this.toDateKey(expectedDate)) {
      expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000);
      if (reviewDates[0] !== this.toDateKey(expectedDate)) {
        return 0;
      }
    }

    for (const reviewDate of reviewDates) {
      if (reviewDate !== this.toDateKey(expectedDate)) {
        break;
      }

      streak += 1;
      expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return streak;
  }

  private toUtcDateOnly(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private toDateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
