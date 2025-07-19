import { Module } from '@nestjs/common';
import { AnkiService } from './anki.service';

@Module({
  providers: [AnkiService]
})
export class AnkiModule {}
