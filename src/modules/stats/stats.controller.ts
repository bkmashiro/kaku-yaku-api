import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * GET /api/stats/vocab
   * Returns vocabulary statistics from the word bank.
   */
  @Get('vocab')
  async getVocabStats() {
    return this.statsService.getVocabStats();
  }

  @Get('learning-progress')
  async getLearningProgress() {
    return this.statsService.getLearningProgress();
  }

  @Get('streak')
  async getStreak() {
    return this.statsService.getLearningStreak();
  }
}
