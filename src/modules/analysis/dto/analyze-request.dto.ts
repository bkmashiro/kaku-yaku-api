import { IsString, IsOptional, IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { SudachiMode } from '../../../../sudachi-native';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 句子分析请求 DTO
 */
export class AnalyzeSentenceRequestDto {
  @ApiProperty({
    description: '需要分析的日语句子',
    example: '私は毎日日本語を勉強しています。'
  })
  @IsString()
  @IsNotEmpty()
  sentence: string;
  
  @ApiProperty({
    description: 'Sudachi分词模式: A(0)、B(1)或C(2)',
    enum: [0, 1, 2],
    default: 2,
    required: false
  })
  @IsOptional()
  @IsEnum([0, 1, 2])
  mode?: SudachiMode = SudachiMode.C;
}

/**
 * 批量句子分析请求 DTO
 */
export class AnalyzeSentenceBatchRequestDto {
  @ApiProperty({
    description: '需要批量分析的日语句子数组',
    example: ['私は日本語を勉強しています。', '明日東京に行きます。']
  })
  @IsArray()
  @IsString({ each: true })
  sentences: string[];
  
  @ApiProperty({
    description: 'Sudachi分词模式: A(0)、B(1)或C(2)',
    enum: [0, 1, 2],
    default: 2,
    required: false
  })
  @IsOptional()
  @IsEnum([0, 1, 2])
  mode?: SudachiMode = SudachiMode.C;
}

/**
 * 文本分析请求 DTO
 */
export class AnalyzeTextRequestDto {
  @ApiProperty({
    description: '需要分析的日语文本（将自动分割成句子）',
    example: '私は日本語を勉強しています。明日東京に行きます。'
  })
  @IsString()
  @IsNotEmpty()
  text: string;
  
  @ApiProperty({
    description: 'Sudachi分词模式: A(0)、B(1)或C(2)',
    enum: [0, 1, 2],
    default: 2,
    required: false
  })
  @IsOptional()
  @IsEnum([0, 1, 2])
  mode?: SudachiMode = SudachiMode.C;
} 