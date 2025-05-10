import { Module } from '@nestjs/common';
import { SudachiService } from './sudachi.service';
import { SudachiController } from './sudachi.controller';

@Module({
  controllers: [SudachiController],
  providers: [SudachiService],
  exports: [SudachiService],
})
export class SudachiModule {}
