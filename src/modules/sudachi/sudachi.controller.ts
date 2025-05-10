import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { SudachiService } from './sudachi.service';
import { AnalyzeSentenceDto, AnalyzeSentenceResponseDto } from './dto/analyze-sentence.dto';
import { SudachiMode } from '../../../sudachi-native';

// 定义形态素类型接口
interface MorphemeToken {
  surface: string;
  partOfSpeech: string[];
  dictionaryForm: string;
  readingForm: string;
  [key: string]: any; // 允许其他属性
}

@Controller('sudachi')
export class SudachiController {
  constructor(private readonly sudachiService: SudachiService) {}

  /**
   * 分析句子，包括分句和分词
   */
  @Post('analyze')
  async analyzeSentence(@Body() dto: AnalyzeSentenceDto): Promise<AnalyzeSentenceResponseDto> {
    // 1. 分句（使用原始带空格文本）
    const sentences = this.sudachiService.splitSentences(dto.text);
    
    // 2. 对每个句子分词分析
    const result = sentences.map(sentence => {
      // 存储不带空格的句子用于显示
      const displaySentence = sentence.replace(/\s+/g, '');
      
      // 使用原始带空格的句子进行分词分析，以保持词形和词典信息的完整
      const morphemesA = this.sudachiService.tokenize(sentence, { mode: SudachiMode.A, printAll: true });
      const morphemesB = this.sudachiService.tokenize(sentence, { mode: SudachiMode.B, printAll: true });
      const morphemesC = this.sudachiService.tokenize(sentence, { mode: SudachiMode.C, printAll: true });
      
      // 标准文本格式输出（使用原始句子）
      const textOutputA = this.sudachiService.tokenizeToString(sentence, { mode: SudachiMode.A });
      const textOutputB = this.sudachiService.tokenizeToString(sentence, { mode: SudachiMode.B, printAll: true });
      const wakatiOutput = this.sudachiService.tokenizeToString(sentence, { mode: SudachiMode.C, wakati: true });
      
      // 处理分词结果中的表层形式，移除空格（相关单词匹配会比较表层形式）
      const processTokens = (tokens: MorphemeToken[]) => {
        return tokens.map(token => {
          if (token.surface) {
            return {
              ...token,
              surface: token.surface.replace(/\s+/g, '')
            };
          }
          return token;
        });
      };
      
      return {
        sentence: displaySentence, // 返回不带空格的句子用于显示
        analysis: {
          modeA: processTokens(morphemesA as MorphemeToken[]),
          modeB: processTokens(morphemesB as MorphemeToken[]),
          modeC: processTokens(morphemesC as MorphemeToken[]),
          textOutputA,
          textOutputB,
          wakatiOutput
        }
      };
    });
    
    return {
      original: dto.text.replace(/\s+/g, ''), // 返回不带空格的原始文本
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
    
    // 保留原始文本用于分词，移除空格用于显示
    const displayText = text.replace(/\s+/g, '');
    
    // 获取分词结果
    const tokens = this.sudachiService.tokenize(text, { mode: modeValue }) as MorphemeToken[];
    
    // 处理分词结果中的表层形式，移除空格
    const processedTokens = tokens.map(token => {
      if (token.surface) {
        return {
          ...token,
          surface: token.surface.replace(/\s+/g, '')
        };
      }
      return token;
    });
    
    return {
      text: displayText, // 返回不带空格的文本用于显示
      tokens: processedTokens, // 返回处理后的分词结果
      wakati: wakatiValue ? this.sudachiService.tokenizeToString(text, { mode: modeValue, wakati: true }) : undefined
    };
  }
} 