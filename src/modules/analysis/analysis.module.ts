import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { SudachiModule } from '../sudachi/sudachi.module';
import { RawModule } from '../raw/raw.module';

@Module({
  imports: [SudachiModule, RawModule],
  providers: [AnalysisService],
  controllers: [AnalysisController],
  exports: [AnalysisService]
})
export class AnalysisModule {}
