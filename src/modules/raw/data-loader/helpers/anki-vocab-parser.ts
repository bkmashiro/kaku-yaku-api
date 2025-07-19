import { createReadStream } from 'fs';
import { Readable, Transform } from 'stream';
import { AnkiVocab } from '../../entities/anki-vocab.entity';
import { AnkiSentence } from '../../entities/anki-sentence.entity';

/**
 * Anki 词汇解析器
 * 
 * 提供高效的 Anki CSV 数据解析功能，支持流式处理
 * 解析 Anki 导出的 CSV 格式词汇数据
 * 支持例句分离存储到独立表中
 */
export class AnkiVocabParser {
  private readonly csvSeparator = ',';
  private readonly maxColumns = 38; // CSV 文件的最大列数

  /**
   * 解析单个 CSV 行
   * @param line CSV 行字符串
   * @returns 解析后的 AnkiVocab 实体和相关的 AnkiSentence 实体数组
   */
  parseLine(line: string): { vocab: AnkiVocab; sentences: AnkiSentence[] } {
    // 跳过注释行
    if (line.startsWith('#')) {
      return null;
    }

    // 解析 CSV 行，处理引号内的逗号
    const columns = this.parseCSVLine(line);
    
    if (columns.length < 10) {
      console.warn('Invalid CSV line, insufficient columns:', line);
      return null;
    }

    const vocab = new AnkiVocab();
    const sentences: AnkiSentence[] = [];

    try {
      // 解析基本词汇信息
      vocab.noteId = columns[1] || this.generateUUID(); // noteId
      vocab.kanji = columns[2] || ''; // 汉字
      vocab.pitch = columns[3] || null; // 音调
      vocab.pos = this.parsePos(columns[4]); // 词性
      vocab.reading = columns[5] || null; // 读音
      vocab.definitionCn = columns[6] || null; // 简体中文释义
      vocab.definitionTc = columns[7] || null; // 繁体中文释义
      vocab.plusInfo = columns[8] || null; // 额外信息
      vocab.audioUrl = this.extractAudioUrl(columns[9]); // 音频URL

      // 解析例句（最多4个）
      // 例句1：第11-16列
      if (columns[10] && columns[10].trim()) {
        const sentence = new AnkiSentence();
        sentence.index = 0;
        sentence.kanji = columns[11] || null; // 例句汉字
        sentence.furigana = columns[12] || null; // 例句假名
        sentence.definitionCn = columns[13] || null; // 例句简体中文
        sentence.definitionTc = columns[14] || null; // 例句繁体中文
        sentence.audioUrl = this.extractAudioUrl(columns[15]); // 例句音频URL
        sentences.push(sentence);
      }

      // 例句2：第17-22列
      if (columns[16] && columns[16].trim()) {
        const sentence = new AnkiSentence();
        sentence.index = 1;
        sentence.kanji = columns[17] || null; // 例句汉字
        sentence.furigana = columns[18] || null; // 例句假名
        sentence.definitionCn = columns[19] || null; // 例句简体中文
        sentence.definitionTc = columns[20] || null; // 例句繁体中文
        sentence.audioUrl = this.extractAudioUrl(columns[21]); // 例句音频URL
        sentences.push(sentence);
      }

      // 例句3：第23-28列
      if (columns[22] && columns[22].trim()) {
        const sentence = new AnkiSentence();
        sentence.index = 2;
        sentence.kanji = columns[23] || null; // 例句汉字
        sentence.furigana = columns[24] || null; // 例句假名
        sentence.definitionCn = columns[25] || null; // 例句简体中文
        sentence.definitionTc = columns[26] || null; // 例句繁体中文
        sentence.audioUrl = this.extractAudioUrl(columns[27]); // 例句音频URL
        sentences.push(sentence);
      }

      // 例句4：第29-34列
      if (columns[28] && columns[28].trim()) {
        const sentence = new AnkiSentence();
        sentence.index = 3;
        sentence.kanji = columns[29] || null; // 例句汉字
        sentence.furigana = columns[30] || null; // 例句假名
        sentence.definitionCn = columns[31] || null; // 例句简体中文
        sentence.definitionTc = columns[32] || null; // 例句繁体中文
        sentence.audioUrl = this.extractAudioUrl(columns[33]); // 例句音频URL
        sentences.push(sentence);
      }

      // 解析频率信息（第35列）
      if (columns[34] && columns[34].trim() && !isNaN(parseInt(columns[34]))) {
        vocab.frequency = parseInt(columns[34]);
      }

      // 解析替代形式（第36-37列）
      vocab.alt1 = columns[35] || null;
      vocab.alt2 = columns[36] || null;

      // 解析 JLPT 等级信息（第38列标签）
      if (columns[37]) {
        vocab.jlpt = this.extractJLPTLevels(columns[37]);
      }

      // 关联例句到词汇
      vocab.sentences = sentences;

    } catch (error) {
      console.error('Error parsing CSV line:', error, line);
      return null;
    }

    return { vocab, sentences };
  }

  /**
   * 解析 CSV 行，正确处理引号内的逗号
   * @param line CSV 行字符串
   * @returns 解析后的列数组
   */
  private parseCSVLine(line: string): string[] {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // 处理转义的引号
          current += '"';
          i += 2;
        } else {
          // 切换引号状态
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === this.csvSeparator && !inQuotes) {
        // 遇到分隔符且不在引号内
        columns.push(current.trim());
        current = '';
        i++;
      } else {
        // 普通字符
        current += char;
        i++;
      }
    }

    // 添加最后一列
    columns.push(current.trim());

    return columns;
  }

  /**
   * 从音频字段中提取音频URL
   * @param audioField 音频字段字符串
   * @returns 提取的音频URL或null
   */
  private extractAudioUrl(audioField: string): string | null {
    if (!audioField || !audioField.trim()) {
      return null;
    }

    // 处理 [sound:filename.mp3] 格式
    const soundMatch = audioField.match(/\[sound:(.*?)\]/);
    if (soundMatch) {
      return soundMatch[1];
    }

    // 处理其他音频格式
    return audioField.trim();
  }

  /**
   * 从标签字段中提取 JLPT 等级信息
   * @param tagsField 标签字段字符串
   * @returns JLPT 等级数组
   */
  private extractJLPTLevels(tagsField: string): string[] {
    if (!tagsField || !tagsField.trim()) {
      return null;
    }

    const levels: string[] = [];
    const tags = tagsField.split(' ');

    for (const tag of tags) {
      // 匹配 JLPT 等级标签
      const jlptMatch = tag.match(/NEW-JLPT-v2::(N[1-5])/);
      if (jlptMatch) {
        levels.push(jlptMatch[1]);
      }
    }

    return levels.length > 0 ? levels : null;
  }

  /**
   * 解析词性字段，将复合词性分割成数组
   * @param posField 词性字段字符串
   * @returns 词性数组或null
   */
  private parsePos(posField: string): string[] | null {
    if (!posField || !posField.trim()) {
      return null;
    }

    // 按・分割词性
    const posArray = posField.split('・').map(pos => pos.trim()).filter(pos => pos.length > 0);
    
    return posArray.length > 0 ? posArray : null;
  }

  /**
   * 生成 UUID（当 noteId 缺失时使用）
   * @returns 生成的 UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 创建用于处理 CSV 数据的转换流
   * @returns 将 CSV 数据块转换为 AnkiVocab 实体的转换流
   */
  createTransformStream(): Transform {
    let buffer = '';
    let lineNumber = 0;
    const parser = this;

    return new Transform({
      objectMode: true,
      transform(chunk: Buffer, encoding, callback) {
        buffer += chunk.toString();

        // 按行分割
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

        for (const line of lines) {
          lineNumber++;
          
          // 跳过注释行
          if (line.startsWith('#')) {
            continue;
          }

          try {
            const result = parser.parseLine(line);
            if (result) {
              this.push(result);
            }
          } catch (error) {
            console.error(`Error parsing line ${lineNumber}:`, error);
          }
        }

        callback();
      },
    });
  }

  /**
   * 从文件路径解析 CSV 数据
   * @param filePath CSV 文件路径
   * @returns 解析完成时解析的 Promise
   */
  async parseFile(filePath: string): Promise<{ vocab: AnkiVocab; sentences: AnkiSentence[] }[]> {
    return new Promise((resolve, reject) => {
      const results: { vocab: AnkiVocab; sentences: AnkiSentence[] }[] = [];
      const transform = this.createTransformStream();

      transform.on('data', (data) => {
        results.push(data);
      });

      transform.on('end', () => {
        resolve(results);
      });

      transform.on('error', (error) => {
        reject(error);
      });

      createReadStream(filePath).pipe(transform);
    });
  }

  /**
   * 从可读流解析 CSV 数据
   * @param stream 包含 CSV 数据的可读流
   * @returns 解析完成时解析的 Promise
   */
  async parseStream(stream: Readable): Promise<{ vocab: AnkiVocab; sentences: AnkiSentence[] }[]> {
    return new Promise((resolve, reject) => {
      const results: { vocab: AnkiVocab; sentences: AnkiSentence[] }[] = [];
      const transform = this.createTransformStream();

      transform.on('data', (data) => {
        results.push(data);
      });

      transform.on('end', () => {
        resolve(results);
      });

      transform.on('error', (error) => {
        reject(error);
      });

      stream.pipe(transform);
    });
  }
}
