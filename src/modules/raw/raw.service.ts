import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataLoaderService } from './data-loader/data-loader.service';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RawService implements OnModuleInit {
  constructor(
    private readonly dataLoaderService: DataLoaderService,
  ) {}

  async onModuleInit() {
    await this.dataLoaderService.loadAllData();
  }
}
