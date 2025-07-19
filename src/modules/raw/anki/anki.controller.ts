import { Controller, Get, Query } from '@nestjs/common';
import { AnkiService, PaginationOptions } from './anki.service';

@Controller('anki')
export class AnkiController {
  constructor(private readonly ankiService: AnkiService) {}

  /**
   * 根据词性查找词汇列表
   * GET /anki/pos?pos=名&page=1&limit=20
   */
  @Get('pos')
  async findByPos(
    @Query('pos') pos: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const options: PaginationOptions = { page, limit };
    return this.ankiService.findByPos(pos, options);
  }

  /**
   * 根据JLPT等级查找词汇列表
   * GET /anki/jlpt?level=N1&page=1&limit=20
   */
  @Get('jlpt')
  async findByJLPTLevel(
    @Query('level') level: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const options: PaginationOptions = { page, limit };
    return this.ankiService.findByJLPTLevel(level, options);
  }

  /**
   * 获取所有可用的词性列表
   * GET /anki/pos-types
   */
  @Get('pos-types')
  async getAllPosTypes() {
    return this.ankiService.getAllPosTypes();
  }

  /**
   * 获取所有可用的JLPT等级列表
   * GET /anki/jlpt-levels
   */
  @Get('jlpt-levels')
  async getAllJLPTLevels() {
    return this.ankiService.getAllJLPTLevels();
  }
} 