import { Module } from '@nestjs/common';
import { SudachiService } from './sudachi.service';

@Module({
  providers: [SudachiService]
})
export class SudachiModule {}
