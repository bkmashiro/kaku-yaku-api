import { Injectable, Logger } from '@nestjs/common';
import { SudachiService } from '../sudachi/sudachi.service';
import { RawService } from '../raw/raw.service';
import { JmDictService } from '../raw/jm-dict/jm-dict.service';
import { SudachiMode } from '../../../sudachi-native';
import { JMDict } from '../raw/entities/jm-dict.entity';
import {
  MorphemeToken,
  TokenAnalysisResponseDto,
  SentenceAnalysisResponseDto,
  TextAnalysisResponseDto
} from './dto/analysis-result.dto';

const JMDICT_CACHE_MAX = 5000;

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly jmdictCache = new Map<string, JMDict[]>();

  constructor(
    private readonly sudachiService: SudachiService,
    private readonly rawService: RawService,
    private readonly jmDictService: JmDictService,
  ) {}

  /**
   * Build a term→entries Map for a set of tokens, using memory cache.
   */
  private async lookupTokens(tokens: MorphemeToken[]): Promise<Map<string, JMDict[]>> {
    // Collect unique terms (dictionaryForm + surface), skip pure kana-only if desired
    const allTerms = [...new Set(
      tokens.flatMap(t => [t.dictionaryForm, t.surface].filter(Boolean))
    )];

    // Split into cached and uncached
    const uncached = allTerms.filter(term => !this.jmdictCache.has(term));

    if (uncached.length) {
      const entries = await this.jmDictService.searchBulk(uncached);

      // Build per-term buckets for uncached terms
      const buckets = new Map<string, JMDict[]>();
      for (const term of uncached) {
        buckets.set(term, []);
      }
      for (const entry of entries) {
        for (const term of [...(entry.keb || []), ...(entry.reb || [])]) {
          if (buckets.has(term)) {
            buckets.get(term)!.push(entry);
          }
        }
      }

      // Evict oldest entries if cache is full
      for (const [term, matched] of buckets) {
        if (this.jmdictCache.size >= JMDICT_CACHE_MAX) {
          const firstKey = this.jmdictCache.keys().next().value;
          this.jmdictCache.delete(firstKey);
        }
        this.jmdictCache.set(term, matched);
      }
    }

    // Build result map from cache
    const result = new Map<string, JMDict[]>();
    for (const term of allTerms) {
      result.set(term, this.jmdictCache.get(term) || []);
    }
    return result;
  }

  /**
   * Pick JMDict entries for a single token from the lookup map.
   * Prefer dictionaryForm match; fall back to surface.
   */
  private resolveToken(token: MorphemeToken, map: Map<string, JMDict[]>): JMDict[] {
    const byDict = map.get(token.dictionaryForm) || [];
    const bySurface = token.surface !== token.dictionaryForm
      ? (map.get(token.surface) || [])
      : [];

    // Merge deduped by ent_seq
    const seen = new Set<number>();
    const merged: JMDict[] = [];
    for (const entry of [...byDict, ...bySurface]) {
      if (!seen.has(entry.ent_seq)) {
        seen.add(entry.ent_seq);
        merged.push(entry);
      }
    }
    return merged;
  }

  /**
   * 分析单个句子
   */
  async analyzeSentence(
    sentence: string,
    mode: SudachiMode = SudachiMode.C,
    findExamples: boolean = true
  ): Promise<SentenceAnalysisResponseDto> {
    try {
      const tokens = this.sudachiService.tokenize(sentence, { mode, printAll: true }) as MorphemeToken[];

      // Per-token JMDict lookup via cache
      const jmdictMap = await this.lookupTokens(tokens);

      // Single-char kanji lookup via raw service (kanjiDict)
      const singleCharKanji = new Set<string>();
      for (const token of tokens) {
        if (token.surface.length === 1 && this.isKanji(token.surface)) {
          singleCharKanji.add(token.surface);
        }
      }

      const kanjiMap = new Map<string, any>();
      if (singleCharKanji.size) {
        const bulkResult = await this.rawService.bulkAggregatedSearch([...singleCharKanji]);
        bulkResult.queries.forEach((q, i) => {
          if (bulkResult.kanjiResults[i]) {
            kanjiMap.set(q, bulkResult.kanjiResults[i]);
          }
        });
      }

      // Example sentences
      let exampleResults = [];
      if (findExamples) {
        const singleResult = await this.rawService.aggregatedSearch(sentence);
        exampleResults = singleResult.examples || [];
      }

      const tokenAnalyses: TokenAnalysisResponseDto[] = tokens.map(token => {
        const matchedJmdict = this.resolveToken(token, jmdictMap);
        const matchedKanji = (token.surface.length === 1 && this.isKanji(token.surface))
          ? (kanjiMap.get(token.surface) || null)
          : null;

        return {
          surface: token.surface,
          dictionaryForm: token.dictionaryForm,
          normalizedForm: token.normalizedForm,
          reading: token.readingForm,
          pos: token.partOfSpeech[0],
          posDetail: token.partOfSpeech.slice(1),
          isOov: token.isOov,
          jmdict: matchedJmdict,
          kanji: matchedKanji,
          meanings: matchedJmdict[0]?.gloss?.slice(0, 3) || [],
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
   */
  async analyzeText(
    text: string,
    mode: SudachiMode = SudachiMode.C
  ): Promise<TextAnalysisResponseDto> {
    const sentences = this.sudachiService.splitSentences(text);

    const sentenceAnalyses = await Promise.all(
      sentences.map((sentence, index) =>
        this.analyzeSentence(
          sentence,
          mode,
          index === sentences.length - 1
        )
      )
    );

    return {
      original: text,
      sentences: sentenceAnalyses,
    };
  }

  /**
   * 批量分析句子
   */
  async analyzeSentenceBatch(
    sentences: string[],
    mode: SudachiMode = SudachiMode.C
  ): Promise<SentenceAnalysisResponseDto[]> {
    if (!sentences.length) return [];

    try {
      // Tokenize all sentences
      const allTokensByIndex: MorphemeToken[][] = sentences.map(sentence =>
        this.sudachiService.tokenize(sentence, { mode, printAll: true }) as MorphemeToken[]
      );

      // Collect all tokens for batch lookup
      const allTokens = allTokensByIndex.flat();
      const jmdictMap = await this.lookupTokens(allTokens);

      // Collect single-char kanji across all tokens
      const singleCharKanji = new Set<string>();
      for (const token of allTokens) {
        if (token.surface.length === 1 && this.isKanji(token.surface)) {
          singleCharKanji.add(token.surface);
        }
      }

      const kanjiMap = new Map<string, any>();
      if (singleCharKanji.size) {
        const bulkResult = await this.rawService.bulkAggregatedSearch([...singleCharKanji]);
        bulkResult.queries.forEach((q, i) => {
          if (bulkResult.kanjiResults[i]) {
            kanjiMap.set(q, bulkResult.kanjiResults[i]);
          }
        });
      }

      return sentences.map((sentence, sentenceIndex) => {
        const tokens = allTokensByIndex[sentenceIndex];

        const tokenAnalyses: TokenAnalysisResponseDto[] = tokens.map(token => {
          const matchedJmdict = this.resolveToken(token, jmdictMap);
          const matchedKanji = (token.surface.length === 1 && this.isKanji(token.surface))
            ? (kanjiMap.get(token.surface) || null)
            : null;

          return {
            surface: token.surface,
            dictionaryForm: token.dictionaryForm,
            normalizedForm: token.normalizedForm,
            reading: token.readingForm,
            pos: token.partOfSpeech[0],
            posDetail: token.partOfSpeech.slice(1),
            isOov: token.isOov,
            jmdict: matchedJmdict,
            kanji: matchedKanji,
            meanings: matchedJmdict[0]?.gloss?.slice(0, 3) || [],
          };
        });

        return {
          original: sentence,
          tokens: tokenAnalyses,
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
    const code = char.charCodeAt(0);
    return (
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x20000 && code <= 0x2A6DF) ||
      (code >= 0x2A700 && code <= 0x2B73F) ||
      (code >= 0x2B740 && code <= 0x2B81F) ||
      (code >= 0x2B820 && code <= 0x2CEAF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0x2F800 && code <= 0x2FA1F)
    );
  }
}
