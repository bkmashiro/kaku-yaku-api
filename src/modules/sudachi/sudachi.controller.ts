import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { SudachiService } from './sudachi.service';
import { AnalyzeSentenceDto, AnalyzeSentenceResponseDto } from './dto/analyze-sentence.dto';
import { SudachiMode } from '../../../sudachi-native';

@Controller('sudachi')
export class SudachiController {
  constructor(private readonly sudachiService: SudachiService) {}

  /**
   * 分析句子，包括分句和分词
   */
  @Post('analyze')
  async analyzeSentence(@Body() dto: AnalyzeSentenceDto): Promise<AnalyzeSentenceResponseDto> {
    // 1. 分句
    const sentences = this.sudachiService.splitSentences(dto.text);
    
    // 2. 对每个句子分词分析
    const result = sentences.map(sentence => {
      // 获取不同模式的形态素分析结果
      const morphemesA = this.sudachiService.tokenize(sentence, { mode: SudachiMode.A, printAll: true });
      const morphemesB = this.sudachiService.tokenize(sentence, { mode: SudachiMode.B, printAll: true });
      const morphemesC = this.sudachiService.tokenize(sentence, { mode: SudachiMode.C, printAll: true });
      
      // 标准文本格式输出
      const textOutputA = this.sudachiService.tokenizeToString(sentence, { mode: SudachiMode.A });
      const textOutputB = this.sudachiService.tokenizeToString(sentence, { mode: SudachiMode.B, printAll: true });
      const wakatiOutput = this.sudachiService.tokenizeToString(sentence, { mode: SudachiMode.C, wakati: true });
      
      return {
        sentence,
        analysis: {
          modeA: morphemesA,
          modeB: morphemesB,
          modeC: morphemesC,
          textOutputA,
          textOutputB,
          wakatiOutput
        }
      };
    });
    
    return {
      original: dto.text,
      sentences: result
    };
  }

  /**
   * 简单分词，支持查询参数
   */
  @Get('tokenize')
  tokenize(
    @Query('text') text: string,
    @Query('mode') mode?: string,
    @Query('wakati') wakati?: string,
  ) {
    const modeValue = mode !== undefined ? Number(mode) : SudachiMode.C;
    const wakatiValue = wakati === 'true';
    
    return {
      text,
      tokens: this.sudachiService.tokenize(text, { mode: modeValue }),
      wakati: wakatiValue ? this.sudachiService.tokenizeToString(text, { mode: modeValue, wakati: true }) : undefined
    };
  }
} 