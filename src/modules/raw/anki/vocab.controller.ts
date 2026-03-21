import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { AnkiService } from './anki.service';

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
