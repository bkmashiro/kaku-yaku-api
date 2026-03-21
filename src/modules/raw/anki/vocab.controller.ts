import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
