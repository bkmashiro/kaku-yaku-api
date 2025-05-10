import { Controller, Post, Body, Get, Query, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { SudachiMode } from '../../../sudachi-native';
import { 
  AnalyzeSentenceRequestDto, 
  AnalyzeSentenceBatchRequestDto, 
  AnalyzeTextRequestDto 
} from './dto/analyze-request.dto';
import { 
  SentenceAnalysisResponseDto, 
  TextAnalysisResponseDto 
} from './dto/analysis-result.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('分析')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}
  
  /**
   * 分析单个句子
   * @param dto 句子分析请求参数
   */
  @ApiOperation({ summary: '分析单个句子', description: '对一个日语句子进行分词和词典查询' })
  @ApiResponse({ 
    status: 200, 
    description: '句子分析结果，包含分词和词典信息', 
    type: SentenceAnalysisResponseDto 
  })
  @Post('sentence')
  async analyzeSentence(@Body(ValidationPipe) dto: AnalyzeSentenceRequestDto): Promise<SentenceAnalysisResponseDto> {
    return this.analysisService.analyzeSentence(dto.sentence, dto.mode);
  }
  
  /**
   * 批量分析多个句子
   * @param dto 批量句子分析请求参数
   */
  @ApiOperation({ summary: '批量分析句子', description: '批量处理多个日语句子，进行分词和词典查询' })
  @ApiResponse({ 
    status: 200, 
    description: '句子分析结果数组', 
    type: [SentenceAnalysisResponseDto] 
  })
  @Post('sentences')
  async analyzeSentences(@Body(ValidationPipe) dto: AnalyzeSentenceBatchRequestDto): Promise<SentenceAnalysisResponseDto[]> {
    return this.analysisService.analyzeSentenceBatch(dto.sentences, dto.mode);
  }
  
  /**
   * 分析文本（自动划分句子）
   * @param dto 文本分析请求参数
   */
  @ApiOperation({ summary: '分析文本', description: '对完整日语文本进行句子切分、分词和词典查询' })
  @ApiResponse({ 
    status: 200, 
    description: '文本分析结果，包含多个句子的分析', 
    type: TextAnalysisResponseDto 
  })
  @Post('text')
  async analyzeText(@Body(ValidationPipe) dto: AnalyzeTextRequestDto): Promise<TextAnalysisResponseDto> {
    return this.analysisService.analyzeText(dto.text, dto.mode);
  }
  
  /**
   * 快速查询句子（GET 方法，方便直接在浏览器使用）
   * @param sentence 查询句子
   * @param mode 分词模式
   */
  @ApiOperation({ summary: '快速分析句子', description: '通过GET方法对日语句子进行分析（适合浏览器直接调用）' })
  @ApiResponse({ 
    status: 200, 
    description: '句子分析结果', 
    type: SentenceAnalysisResponseDto 
  })
  @ApiQuery({ 
    name: 'sentence', 
    description: '需要分析的日语句子', 
    required: true 
  })
  @ApiQuery({ 
    name: 'mode', 
    description: 'Sudachi分词模式: A(0)、B(1)或C(2)', 
    required: false,
    enum: [0, 1, 2],
    type: Number
  })
  @Get('quick')
  async quickAnalyze(
    @Query('sentence') sentence: string,
    @Query('mode') modeParam: string = "2"
  ): Promise<SentenceAnalysisResponseDto> {
    // 将字符串参数转换为数字
    const modeNumber = parseInt(modeParam, 10);
    
    // 确保 mode 是有效的数字，否则使用默认值 SudachiMode.C (2)
    const mode = !isNaN(modeNumber) && [0, 1, 2].includes(modeNumber) 
      ? modeNumber as SudachiMode
      : SudachiMode.C;
      
    return this.analysisService.analyzeSentence(sentence, mode);
  }
}
