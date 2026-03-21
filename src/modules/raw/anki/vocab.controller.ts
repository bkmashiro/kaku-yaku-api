import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AnkiService } from './anki.service';
import { ReviewVocabDto } from './dto/review-vocab.dto';

@Controller('vocab')
export class VocabController {
  constructor(private readonly ankiService: AnkiService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    return this.ankiService.searchVocab(query);
  }

  @Get('review')
  async review() {
    return this.ankiService.getReviewVocab();
  }

  @Get('due')
  async due() {
    return this.ankiService.getDueVocab();
  }

  @Get('stats/srs')
  async getSrsStats() {
    return this.ankiService.getSrsStats();
  }

  @Post('import')
  async importVocab(
    @Body() body: unknown,
    @Headers('content-type') contentType?: string,
  ) {
    const format = typeof body === 'string' || contentType?.includes('csv') ? 'csv' : 'json';
    return this.ankiService.importVocab(body as never, format);
  }

  @Get('export')
  async exportVocab(
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res({ passthrough: true }) response: Response,
  ) {
    const normalizedFormat = format === 'csv' ? 'csv' : 'json';

    if (normalizedFormat === 'csv') {
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    }

    return this.ankiService.exportVocab(normalizedFormat);
  }

  @Post(':id/review')
  async reviewResult(@Param('id') noteId: string, @Body() body: ReviewVocabDto) {
    return this.ankiService.reviewVocab(noteId, body.known);
  }

  @Patch(':id/review')
  async markReviewed(@Param('id') noteId: string) {
    return this.ankiService.markReviewed(noteId);
  }

  @Patch(':id/known')
  async markKnown(@Param('id') noteId: string) {
    return this.ankiService.markKnown(noteId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') noteId: string) {
    await this.ankiService.deleteVocab(noteId);
  }
}
