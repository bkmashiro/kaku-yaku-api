import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SudachiTokenizer, SudachiMode } from '../../../sudachi-native';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
export interface TokenizeOptions {
  mode?: SudachiMode; // A=0, B=1, C=2
  printAll?: boolean;
}

export interface TokenizeToStringOptions extends TokenizeOptions {
  wakati?: boolean;
}

/**
 * 日语形态素分析服务
 */
@Injectable()
export class SudachiService implements OnModuleInit {
  private tokenizer: SudachiTokenizer;
  private readonly logger = new Logger(SudachiService.name);

  constructor(private readonly configService: ConfigService) {
    // 初始化将在 onModuleInit 中进行
  }

  /**
   * 模块初始化时创建 Sudachi 分词器
   */
  async onModuleInit() {
    try {
      // 查找字典文件路径
      const dictionaryPath = this.findDictionaryPath();
      this.logger.log(`使用字典: ${dictionaryPath}`);

      // 创建 Sudachi 分词器
      this.tokenizer = new SudachiTokenizer(null, null, dictionaryPath);
      this.logger.log('Sudachi 分词器初始化成功');
    } catch (error) {
      this.logger.error(`Sudachi 分词器初始化失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查找字典文件路径
   */
  private findDictionaryPath(): string {
    // 尝试查找可能的字典路径
    const possiblePaths = [this.configService.getOrThrow('DICTIONARY_PATH')];

    for (const dictPath of possiblePaths) {
      if (fs.existsSync(dictPath)) {
        return dictPath;
      }
    }

    // 如果找不到字典，抛出错误
    throw new Error('无法找到 Sudachi 字典文件，请下载并配置字典');
  }

  /**
   * 分词，返回形态素对象数组
   */
  tokenize(text: string, options: TokenizeOptions = {}) {
    const mode = options.mode ?? SudachiMode.C;
    const printAll = options.printAll ?? false;

    const result = this.tokenizer.tokenize(text, mode, printAll);

    // console.log(result);
    
    return result;
  }

  /**
   * 分词，返回文本格式结果
   */
  tokenizeToString(text: string, options: TokenizeToStringOptions = {}) {
    const mode = options.mode ?? SudachiMode.C;
    const wakati = options.wakati ?? false;
    const printAll = options.printAll ?? false;

    return this.tokenizer.tokenizeToString(text, mode, wakati, printAll);
  }

  /**
   * 句子分割（JavaScript 实现）
   * 用于将长文本分割成句子
   */
  splitSentences(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // 处理换行符和制表符，将其转换为空格，但保留空格以便分词
    const normalizedText = text.replace(/[\r\n\t]+/g, ' ');

    // 使用正则表达式分割句子
    // 匹配日语句号(。)、感叹号(！)、问号(？)、中文句号(。)等作为句子结束标志
    const sentences = [];
    const pattern = /(.*?[。！？\!\?]+)/g;
    let match;

    // 匹配所有带句末标点的句子
    let lastIndex = 0;
    while ((match = pattern.exec(normalizedText)) !== null) {
      sentences.push(match[0]);
      lastIndex = pattern.lastIndex;
    }

    // 处理最后没有句末标点的文本
    if (lastIndex < normalizedText.length) {
      const remainingText = normalizedText.slice(lastIndex);
      if (remainingText.trim().length > 0) {
        sentences.push(remainingText);
      }
    }

    // 如果没有找到任何句子，返回原文本
    if (sentences.length === 0 && normalizedText.trim().length > 0) {
      sentences.push(normalizedText);
    }

    // 移除所有空格

    return sentences.map((sentence) => sentence.replace(/\s+/g, ''));
  }
}
