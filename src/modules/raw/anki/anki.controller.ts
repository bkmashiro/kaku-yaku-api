import { Controller, Get, Query } from '@nestjs/common';
import { AnkiService, PaginationOptions, FilterOptions } from './anki.service';

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

  /**
   * 根据多条件筛选词汇列表
   * GET /anki/filter?pos=名,自動3&jlpt=N1,N2&keyword=学习&page=1&limit=20
   */
  @Get('filter')
  async findByFilters(
    @Query('pos') posQuery?: string,
    @Query('jlpt') jlptQuery?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const filters: FilterOptions = {};
    
    // 解析词性参数（逗号分隔）
    if (posQuery && posQuery.trim()) {
      filters.pos = posQuery.split(',').map(p => p.trim()).filter(p => p.length > 0);
    }
    
    // 解析JLPT等级参数（逗号分隔）
    if (jlptQuery && jlptQuery.trim()) {
      filters.jlpt = jlptQuery.split(',').map(j => j.trim()).filter(j => j.length > 0);
    }
    
    // 关键词搜索
    if (keyword && keyword.trim()) {
      filters.keyword = keyword.trim();
    }

    const options: PaginationOptions = { page, limit };
    return this.ankiService.findByFilters(filters, options);
  }
} 