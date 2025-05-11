import { Injectable, Logger } from '@nestjs/common';
import { SudachiService } from '../sudachi/sudachi.service';
import { RawService } from '../raw/raw.service';
import { SudachiMode } from '../../../sudachi-native';
import { 
  MorphemeToken, 
  TokenAnalysisResponseDto, 
  SentenceAnalysisResponseDto, 
  TextAnalysisResponseDto 
} from './dto/analysis-result.dto';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly sudachiService: SudachiService,
    private readonly rawService: RawService,
  ) {}

  /**
   * 分析单个句子
   * @param sentence 输入句子
   * @param mode Sudachi分词模式
   * @param findExamples 是否查找例句
   */
  async analyzeSentence(
    sentence: string,
    mode: SudachiMode = SudachiMode.C,
    findExamples: boolean = true
  ): Promise<SentenceAnalysisResponseDto> {
    try {
      // 1. 对句子进行分词
      const tokens = this.sudachiService.tokenize(sentence, { mode, printAll: true }) as MorphemeToken[];
      
      // 2. 准备需要查询的数据
      const dictionaryForms = tokens.map(token => token.dictionaryForm);
      const readings = tokens.map(token => token.readingForm);
      const surfaces = tokens.map(token => token.surface);
      
      // 提取单字汉字进行查询
      const singleCharacters = new Set<string>();
      surfaces.forEach(surface => {
        if (surface.length === 1 && this.isKanji(surface)) {
          singleCharacters.add(surface);
        }
      });
      dictionaryForms.forEach(form => {
        if (form.length === 1 && this.isKanji(form)) {
          singleCharacters.add(form);
        }
      });
      
      // 3. 使用 RawService 的批量聚合查询
      const allTerms = [
        ...dictionaryForms,
        ...surfaces,
        ...readings
      ];
      
      // 使用聚合查询获取所有词典数据
      const result = await this.rawService.bulkAggregatedSearch(allTerms);
      
      // 如果有必要，查询例句
      let exampleResults = [];
      if (findExamples) {
        const singleResult = await this.rawService.aggregatedSearch(sentence);
        exampleResults = singleResult.examples || [];
      }
      
      // 4. 整合分析结果
      const tokenAnalyses: TokenAnalysisResponseDto[] = tokens.map(token => {
        const surface = token.surface;
        const dictionaryForm = token.dictionaryForm;
        const reading = token.readingForm;
        
        // 查找匹配的日语词典条目
        const matchedJmdict = result.jmdictResults.filter(entry => 
          (entry.keb && entry.keb.includes(dictionaryForm)) || 
          (entry.keb && entry.keb.includes(surface)) ||
          (entry.reb && entry.reb.includes(reading))
        );
        
        // 查找匹配的汉字条目 (仅对单字有效)
        let matchedKanji = null;
        if (surface.length === 1 && this.isKanji(surface)) {
          const kanjiIndex = result.queries.findIndex(q => q === surface);
          if (kanjiIndex >= 0 && result.kanjiResults[kanjiIndex]) {
            matchedKanji = result.kanjiResults[kanjiIndex];
          }
        }
        
        return {
          surface,
          dictionaryForm,
          reading,
          pos: token.partOfSpeech[0], // 品词主分类
          posDetail: token.partOfSpeech.slice(1), // 品词详细信息
          jmdict: matchedJmdict,
          kanji: matchedKanji
        };
      });
      
      return {
        original: sentence,
        tokens: tokenAnalyses,
        examples: exampleResults,
      };
    } catch (error) {
      this.logger.error(`分析句子失败: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * 分析文本 (分割成句子后分别分析)
   * @param text 输入文本
   * @param mode Sudachi分词模式
   */
  async analyzeText(
    text: string, 
    mode: SudachiMode = SudachiMode.C
  ): Promise<TextAnalysisResponseDto> {
    // 1. 分割句子
    const sentences = this.sudachiService.splitSentences(text);
    
    // 2. 对每个句子进行分析 (只为最后一个句子查找例句以提高性能)
    const sentenceAnalyses = await Promise.all(
      sentences.map((sentence, index) => 
        this.analyzeSentence(
          sentence, 
          mode, 
          index === sentences.length - 1 //TODO 只为最后一个句子查找例句
        )
      )
    );
    
    return {
      original: text,
      sentences: sentenceAnalyses,
    };
  }
  
  /**
   * 批量分析句子 (适用于大量短句同时处理)
   * @param sentences 句子数组
   * @param mode Sudachi分词模式
   */
  async analyzeSentenceBatch(
    sentences: string[],
    mode: SudachiMode = SudachiMode.C
  ): Promise<SentenceAnalysisResponseDto[]> {
    if (!sentences.length) return [];
    
    try {
      // 1. 批量分词处理
      const allTokensByIndex: MorphemeToken[][] = sentences.map(sentence => 
        this.sudachiService.tokenize(sentence, { mode, printAll: true }) as MorphemeToken[]
      );
      
      // 2. 收集所有需要查询的唯一表层形式、字典形式和单字汉字
      const allTerms: string[] = [];
      const termIndices: Map<string, number[]> = new Map();
      
      allTokensByIndex.forEach((tokens, sentenceIndex) => {
        tokens.forEach(token => {
          const surface = token.surface;
          const dictionaryForm = token.dictionaryForm;
          const reading = token.readingForm;
          
          // 跟踪每个词条来自哪个句子、哪个词元
          for (const term of [surface, dictionaryForm, reading]) {
            if (!termIndices.has(term)) {
              termIndices.set(term, []);
              allTerms.push(term);
            }
            const indices = termIndices.get(term)!;
            if (!indices.includes(sentenceIndex)) {
              indices.push(sentenceIndex);
            }
          }
        });
      });
      
      // 3. 使用 RawService 的批量聚合查询
      const result = await this.rawService.bulkAggregatedSearch(allTerms);
      
      // 4. 为前 5 个句子查询例句
      const exampleResults = result.examples || [];
      
      // 5. 构建结果
      return sentences.map((sentence, sentenceIndex) => {
        const tokens = allTokensByIndex[sentenceIndex];
        
        const tokenAnalyses: TokenAnalysisResponseDto[] = tokens.map(token => {
          const surface = token.surface;
          const dictionaryForm = token.dictionaryForm;
          const reading = token.readingForm;
          
          // 查找匹配的日语词典条目
          const matchedJmdict = result.jmdictResults.filter(entry => 
            (entry.keb && entry.keb.includes(dictionaryForm)) || 
            (entry.keb && entry.keb.includes(surface)) ||
            (entry.reb && entry.reb.includes(reading))
          );
          
          // 查找匹配的汉字条目
          let matchedKanji = null;
          if (surface.length === 1 && this.isKanji(surface)) {
            const kanjiIndex = result.queries.findIndex(q => q === surface);
            if (kanjiIndex >= 0 && result.kanjiResults[kanjiIndex]) {
              matchedKanji = result.kanjiResults[kanjiIndex];
            }
          }
          
          return {
            surface,
            dictionaryForm,
            reading,
            pos: token.partOfSpeech[0],
            posDetail: token.partOfSpeech.slice(1),
            jmdict: matchedJmdict,
            kanji: matchedKanji
          };
        });
        
        // 为每个句子关联可能的例句
        const relevantExamples = sentenceIndex < 5 
          ? exampleResults.filter(ex => ex.text.includes(sentence))
          : [];
        
        return {
          original: sentence,
          tokens: tokenAnalyses,
          examples: relevantExamples.length > 0 ? relevantExamples : undefined
        };
      });
    } catch (error) {
      this.logger.error(`批量分析句子失败: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * 判断字符是否为汉字
   */
  private isKanji(char: string): boolean {
    if (char.length !== 1) return false;
    
    // 汉字的 Unicode 范围
    const code = char.charCodeAt(0);
    return (
      (code >= 0x4E00 && code <= 0x9FFF) || // CJK 统一表意文字
      (code >= 0x3400 && code <= 0x4DBF) || // CJK 统一表意文字扩展 A
      (code >= 0x20000 && code <= 0x2A6DF) || // CJK 统一表意文字扩展 B
      (code >= 0x2A700 && code <= 0x2B73F) || // CJK 统一表意文字扩展 C
      (code >= 0x2B740 && code <= 0x2B81F) || // CJK 统一表意文字扩展 D
      (code >= 0x2B820 && code <= 0x2CEAF) || // CJK 统一表意文字扩展 E
      (code >= 0xF900 && code <= 0xFAFF) || // CJK 兼容表意文字
      (code >= 0x2F800 && code <= 0x2FA1F) // CJK 兼容表意文字补充
    );
  }
}
