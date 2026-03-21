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
}
