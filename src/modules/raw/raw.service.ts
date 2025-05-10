import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataLoaderService } from './data-loader/data-loader.service';
import { ConfigService } from '@nestjs/config';
import { JmDictService } from './jm-dict/jm-dict.service';
import { KanjiDictService } from './kanji-dict/kanji-dict.service';
import { TatoebaService } from './tatoeba/tatoeba.service';
import { JMDict } from './entities/jm-dict.entity';
import { KanjiDict } from './entities/kanji-dict.entity';
import { TatoebaSentence } from './entities/tatoeba-sentence.entity';

/**
 * 聚合查找结果接口
 */
export interface AggregatedSearchResult {
  query: string;
  kanji?: KanjiDict | null;
  jmdict?: JMDict[];
  examples?: TatoebaSentence[];
}

/**
 * 批量聚合查找结果接口
 */
export interface BulkAggregatedSearchResult {
  queries: string[];
  kanjiResults: (KanjiDict | null)[];
  jmdictResults: JMDict[];
  examples: TatoebaSentence[];
}

@Injectable()
export class RawService implements OnModuleInit {
  constructor(
    private readonly dataLoaderService: DataLoaderService,
    private readonly jmDictService: JmDictService,
    private readonly kanjiDictService: KanjiDictService,
    private readonly tatoebaService: TatoebaService,
  ) {}

  async onModuleInit() {
    await this.dataLoaderService.loadAllData();
  }

  /**
   * 聚合查找：同时查找汉字、词典和例句
   * @param query 查询关键词
   * @param limit 每种结果的返回数量限制
   */
  async aggregatedSearch(query: string, limit: number = 10): Promise<AggregatedSearchResult> {
    // 创建结果对象
    const result: AggregatedSearchResult = { query };

    // 并行执行所有查询以提高性能
    const [kanjiResult, jmdictResults, exampleResults] = await Promise.all([
      // 如果查询是单个字符，查找汉字词典
      query.length === 1 ? this.kanjiDictService.findByLiteral(query) : null,
      // 查找日语词典
      this.jmDictService.search(query),
      // 查找包含该关键词的例句
      this.tatoebaService.searchSentencesILike(query, 'jpn', limit),
    ]);

    // 填充结果
    result.kanji = kanjiResult;
    result.jmdict = jmdictResults;
    result.examples = exampleResults.sentences;

    return result;
  }

  /**
   * 批量聚合查找：同时查找多个关键词的汉字、词典和例句
   * @param queries 查询关键词数组
   * @param limit 每种结果的返回数量限制
   */
  async bulkAggregatedSearch(queries: string[], limit: number = 10): Promise<BulkAggregatedSearchResult> {
    if (!queries.length) {
      return { queries: [], kanjiResults: [], jmdictResults: [], examples: [] };
    }

    // 分离单字查询用于汉字查找
    const singleCharQueries = queries.filter(q => q.length === 1);
    
    // 并行执行所有查询以提高性能
    const [kanjiResults, jmdictResults, exampleResults] = await Promise.all([
      // 查找汉字词典
      singleCharQueries.length 
        ? this.kanjiDictService.findByLiterals(singleCharQueries)
        : [],
      // 批量查找日语词典
      this.jmDictService.searchBulk(queries),
      // 创建例句查询条件，将所有关键词以OR连接
      this.tatoebaService.searchSentencesBulk(
        queries
      ),
    ]);
    
    // 将汉字结果映射回与原始查询相对应的数组
    const mappedKanjiResults = queries.map(query => {
      if (query.length !== 1) return null;
      return kanjiResults.find(k => k.literal === query) || null;
    });

    return {
      queries,
      kanjiResults: mappedKanjiResults,
      jmdictResults,
      examples: exampleResults.sentences,
    };
  }

  /**
   * 通过意思查找：根据释义查找日语词汇和对应的例句
   * @param meaning 释义关键词
   * @param lang 语言代码
   * @param limit 结果数量限制
   */
  async searchByMeaning(meaning: string, lang: string = 'en', limit: number = 10): Promise<{
    jmdict: JMDict[];
    kanji: KanjiDict[];
    examples: TatoebaSentence[];
  }> {
    // 并行执行查询
    const [jmdictResults, kanjiResults] = await Promise.all([
      this.jmDictService.findByMeaning(meaning, limit),
      this.kanjiDictService.findByMeaning(meaning, lang),
    ]);

    // 提取词汇和汉字作为后续例句查询的关键词
    const jmdictTerms = jmdictResults.flatMap(entry => 
      (entry.keb || []).concat(entry.reb || [])
    );
    
    const kanjiTerms = kanjiResults.map(entry => entry.literal);
    
    // 合并关键词并去重
    const searchTerms = [...new Set([...jmdictTerms, ...kanjiTerms])];
    
    // 查找包含这些关键词的例句
    const exampleResults = searchTerms.length
      ? await this.tatoebaService.searchSentencesWithQuery(
          searchTerms.map(term => `"${term}"`).join(' OR '),
          'jpn',
          limit
        )
      : { sentences: [] };

    return {
      jmdict: jmdictResults,
      kanji: kanjiResults,
      examples: exampleResults.sentences,
    };
  }

  /**
   * 批量通过意思查找：根据多个释义查找日语词汇和对应的例句
   * @param meanings 释义关键词数组
   * @param lang 语言代码
   * @param limit 结果数量限制
   */
  async searchByMeaningBulk(meanings: string[], lang: string = 'en', limit: number = 20): Promise<{
    meanings: string[];
    jmdict: JMDict[];
    kanji: KanjiDict[];
    examples: TatoebaSentence[];
  }> {
    if (!meanings.length) {
      return { meanings: [], jmdict: [], kanji: [], examples: [] };
    }

    // 并行执行查询
    const [jmdictResults, kanjiResults] = await Promise.all([
      this.jmDictService.findByMeaningBulk(meanings, limit),
      this.kanjiDictService.findByMeaningBulk(meanings, lang),
    ]);

    // 提取词汇和汉字作为后续例句查询的关键词
    const jmdictTerms = jmdictResults.flatMap(entry => 
      (entry.keb || []).concat(entry.reb || [])
    );
    
    const kanjiTerms = kanjiResults.map(entry => entry.literal);
    
    // 合并关键词并去重
    const searchTerms = [...new Set([...jmdictTerms, ...kanjiTerms])];
    
    // 查找包含这些关键词的例句
    const exampleResults = searchTerms.length
      ? await this.tatoebaService.searchSentencesWithQuery(
          searchTerms.map(term => `"${term}"`).join(' OR '),
          'jpn',
          limit
        )
      : { sentences: [] };

    return {
      meanings,
      jmdict: jmdictResults,
      kanji: kanjiResults,
      examples: exampleResults.sentences,
    };
  }
}
