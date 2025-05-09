import { Transform } from 'stream';
import { TatoebaSentence } from '../../entities/tatoeba-sentence.entity';

/**
 * Tatoeba TSV 解析器
 * 用于解析 Tatoeba 项目的 TSV 格式数据
 */
export class TatoebaParser {
  /**
   * 创建用于处理 TSV 数据的转换流
   * @returns 将 TSV 数据块转换为 TatoebaSentence 实体的转换流
   */
  createTransformStream(): Transform {
    let buffer = '';

    return new Transform({
      objectMode: true,
      transform(chunk: Buffer, encoding, callback) {
        buffer += chunk.toString();

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const [id, lang, text] = line.split('\t');
            if (!id || !lang || !text) continue;

            const sentence = new TatoebaSentence();
            sentence.id = parseInt(id);
            sentence.lang = lang;
            sentence.text = text;

            this.push(sentence);
          } catch (error) {
            console.error('Error parsing line:', line, error);
          }
        }

        callback();
      },
    });
  }
} 