import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 句子分析请求 DTO
 */
export class AnalyzeSentenceDto {
  @ApiProperty({
    description: '要分析的日语文本',
    example:
      '君が医者になりたいと話してくれたあの瞬間、今でもはっきりと覚えている。強く言い切ったからじゃなくて、その言葉を口にしたとき、君の目がきらきらと輝いていたから。',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  text: string;
}

/**
 * 单句分析结果
 */
export interface SentenceAnalysisResult {
  /**
   * 原始句子文本
   */
  sentence: string;

  /**
   * 分析结果
   */
  analysis: {
    /**
     * 短单位分词结果
     */
    modeA: any[];

    /**
     * 中单位分词结果
     */
    modeB: any[];

    /**
     * 长单位分词结果
     */
    modeC: any[];

    /**
     * A模式的标准文本输出
     */
    textOutputA: string;

    /**
     * B模式的详细文本输出
     */
    textOutputB: string;

    /**
     * C模式的分词文本输出
     */
    wakatiOutput: string;
  };
}

/**
 * 句子分析响应 DTO
 */
export class AnalyzeSentenceResponseDto {
  /**
   * 原始文本
   */
  @ApiProperty({
    description: '原始输入文本',
  })
  original: string;

  /**
   * 分句和分析结果
   */
  @ApiProperty({
    description: '分句分析结果',
    type: [Object],
  })
  sentences: SentenceAnalysisResult[];
}
