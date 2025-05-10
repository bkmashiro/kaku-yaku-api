import { ApiProperty } from '@nestjs/swagger';
import { JMDict } from '../../raw/entities/jm-dict.entity';
import { KanjiDict } from '../../raw/entities/kanji-dict.entity';
import { TatoebaSentence } from '../../raw/entities/tatoeba-sentence.entity';

// 定义 Sudachi 分词器返回的 Token 类型
export interface MorphemeToken {
  surface: string;
  dictionaryForm: string;
  readingForm: string;
  partOfSpeech: string[];
  normalizedForm: string;
  dictionaryId: number;
  synonymGroupIds: number[];
  isOov: boolean;
  [key: string]: any;
}

/**
 * 分析结果中的单词信息
 */
export class TokenAnalysisResponseDto {
  @ApiProperty({ description: '词元表层形式' })
  surface: string;

  @ApiProperty({ description: '词元字典形式' })
  dictionaryForm: string;

  @ApiProperty({ description: '词元读音' })
  reading: string;

  @ApiProperty({ description: '词性主分类' })
  pos: string;

  @ApiProperty({ description: '词性详细分类', type: [String] })
  posDetail: string[];
  
  @ApiProperty({ description: '日语词典条目', type: [Object], required: false })
  jmdict?: JMDict[];
  
  @ApiProperty({ description: '汉字词典条目', type: Object, required: false })
  kanji?: KanjiDict | null;
}

/**
 * 句子分析结果
 */
export class SentenceAnalysisResponseDto {
  @ApiProperty({ description: '原始句子' })
  original: string;

  @ApiProperty({ description: '分词结果', type: [TokenAnalysisResponseDto] })
  tokens: TokenAnalysisResponseDto[];

  @ApiProperty({ description: '相关例句', type: [Object], required: false })
  examples?: TatoebaSentence[];
}

/**
 * 文本分析结果
 */
export class TextAnalysisResponseDto {
  @ApiProperty({ description: '原始文本' })
  original: string;

  @ApiProperty({ description: '句子分析结果', type: [SentenceAnalysisResponseDto] })
  sentences: SentenceAnalysisResponseDto[];
} 