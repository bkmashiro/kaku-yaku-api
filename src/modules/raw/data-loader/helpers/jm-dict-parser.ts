import { XMLParser } from 'fast-xml-parser';
import { JMDict, Dialect, Field, KanjiInfo, MiscInfo, PartOfSpeech, ReadingInfo } from '../../entities/jm-dict.entity';
import { Readable, Transform } from 'stream';

/**
 * JMdict XML 解析器
 * 
 * 提供高效的 JMdict XML 数据解析功能，支持流式处理
 * 使用 fast-xml-parser 进行高性能 XML 解析
 * 实现流式处理以高效处理大文件
 */
export class JMDictParser {
  private parser: XMLParser;

  // XML 实体引用映射
  private readonly entityMap: { [key: string]: string } = {
    // 词性相关
    'n': 'n',
    'adj-no': 'adj-no',
    'n-pref': 'n-pref',
    'adj-i': 'adj-i',
    'adj-na': 'adj-na',
    'adj-ix': 'adj-ix',
    'adj-ku': 'adj-ku',
    'adj-nari': 'adj-nari',
    'adj-shiku': 'adj-shiku',
    'adj-t': 'adj-t',
    'adv': 'adv',
    'adv-to': 'adv-to',
    'aux': 'aux',
    'aux-v': 'aux-v',
    'aux-adj': 'aux-adj',
    'conj': 'conj',
    'ctr': 'ctr',
    'exp': 'exp',
    'int': 'int',
    'n-adv': 'n-adv',
    'n-suf': 'n-suf',
    'n-t': 'n-t',
    'num': 'num',
    'pn': 'pn',
    'pref': 'pref',
    'prt': 'prt',
    'suf': 'suf',
    'unc': 'unc',
    'v-unspec': 'v-unspec',
    'v1': 'v1',
    'v1-s': 'v1-s',
    'v2a-s': 'v2a-s',
    'v2b-k': 'v2b-k',
    'v2b-s': 'v2b-s',
    'v2d-k': 'v2d-k',
    'v2d-s': 'v2d-s',
    'v2g-k': 'v2g-k',
    'v2g-s': 'v2g-s',
    'v2h-k': 'v2h-k',
    'v2h-s': 'v2h-s',
    'v2k-k': 'v2k-k',
    'v2k-s': 'v2k-s',
    'v2m-k': 'v2m-k',
    'v2m-s': 'v2m-s',
    'v2n-s': 'v2n-s',
    'v2r-k': 'v2r-k',
    'v2r-s': 'v2r-s',
    'v2s-s': 'v2s-s',
    'v2t-k': 'v2t-k',
    'v2t-s': 'v2t-s',
    'v2w-s': 'v2w-s',
    'v2y-k': 'v2y-k',
    'v2y-s': 'v2y-s',
    'v2z-s': 'v2z-s',
    'v4b': 'v4b',
    'v4g': 'v4g',
    'v4h': 'v4h',
    'v4k': 'v4k',
    'v4m': 'v4m',
    'v4n': 'v4n',
    'v4r': 'v4r',
    'v4s': 'v4s',
    'v4t': 'v4t',
    'v5aru': 'v5aru',
    'v5b': 'v5b',
    'v5g': 'v5g',
    'v5k': 'v5k',
    'v5k-s': 'v5k-s',
    'v5m': 'v5m',
    'v5n': 'v5n',
    'v5r': 'v5r',
    'v5r-i': 'v5r-i',
    'v5s': 'v5s',
    'v5t': 'v5t',
    'v5u': 'v5u',
    'v5u-s': 'v5u-s',
    'v5uru': 'v5uru',
    'vi': 'vi',
    'vk': 'vk',
    'vn': 'vn',
    'vr': 'vr',
    'vs': 'vs',
    'vs-c': 'vs-c',
    'vs-i': 'vs-i',
    'vs-s': 'vs-s',
    'vt': 'vt',
    'vz': 'vz',

    // 汉字和假名信息
    'oK': 'oK',
    'iK': 'iK',
    'ik': 'ik',
    'io': 'io',
    'ateji': 'ateji',
    'rK': 'rK',
    'sK': 'sK',
    'gikun': 'gikun',
    'ok': 'ok',
    'rk': 'rk',
    'sk': 'sk',

    // 其他信息
    'abbr': 'abbr',
    'arch': 'arch',
    'chn': 'chn',
    'col': 'col',
    'derog': 'derog',
    'fam': 'fam',
    'fem': 'fem',
    'hon': 'hon',
    'hum': 'hum',
    'id': 'id',
    'joc': 'joc',
    'male': 'male',
    'obs': 'obs',
    'on-mim': 'on-mim',
    'poet': 'poet',
    'pol': 'pol',
    'rare': 'rare',
    'sens': 'sens',
    'sl': 'sl',
    'uk': 'uk',
    'vulg': 'vulg',
    'yoji': 'yoji',
  };

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => {
        return [
          'k_ele',
          'r_ele',
          'sense',
          'ke_inf',
          'ke_pri',
          're_nokanji',
          're_restr',
          're_inf',
          're_pri',
          'pos',
          'xref',
          'ant',
          'field',
          'misc',
          's_inf',
          'lsource',
          'dial',
          'gloss',
          'example',
        ].includes(name);
      },
      tagValueProcessor: (tagName, tagValue) => {
        if (tagValue === null || tagValue === undefined || tagValue === '') {
          return null;
        }
        if (typeof tagValue === 'string') {
          return tagValue.trim();
        }
        return tagValue;
      },
    });
  }

  /**
   * 解析单个词条
   * @param xmlString 包含单个词条的 XML 字符串
   * @returns 解析后的 JMDict 实体
   */
  parseEntry(xmlString: string): JMDict {
    const parsed = this.parser.parse(xmlString);
    const entry = parsed.entry;

    const jmDict = new JMDict();
    jmDict.ent_seq = parseInt(entry.ent_seq);

    // 处理汉字元素
    if (entry.k_ele) {
      const kEle = Array.isArray(entry.k_ele) ? entry.k_ele : [entry.k_ele];
      jmDict.keb = kEle.map((k: any) => k.keb).filter(Boolean);
      jmDict.ke_inf = kEle.flatMap((k: any) => 
        (k.ke_inf || []).map((inf: string) => this.mapToEnum(inf, KanjiInfo)).filter(Boolean)
      );
      jmDict.ke_pri = kEle.flatMap((k: any) => k.ke_pri || []).filter(Boolean);
    } else {
      jmDict.keb = null;
      jmDict.ke_inf = null;
      jmDict.ke_pri = null;
    }

    // 处理读音元素
    const rEle = Array.isArray(entry.r_ele) ? entry.r_ele : [entry.r_ele];
    jmDict.reb = rEle.map((r: any) => r.reb).filter(Boolean);
    jmDict.re_nokanji = rEle.flatMap((r: any) => r.re_nokanji || []).filter(Boolean);
    jmDict.re_restr = rEle.flatMap((r: any) => r.re_restr || []).filter(Boolean);
    jmDict.re_inf = rEle.flatMap((r: any) => 
      (r.re_inf || []).map((inf: string) => this.mapToEnum(inf, ReadingInfo)).filter(Boolean)
    );
    jmDict.re_pri = rEle.flatMap((r: any) => r.re_pri || []).filter(Boolean);

    // 处理释义元素
    if (entry.sense) {
      const senses = Array.isArray(entry.sense) ? entry.sense : [entry.sense];
      jmDict.pos = senses.flatMap((s: any) => 
        (s.pos || []).map((p: string) => this.mapToEnum(p, PartOfSpeech)).filter(Boolean)
      );
      jmDict.xref = senses.flatMap((s: any) => s.xref || []).filter(Boolean);
      jmDict.ant = senses.flatMap((s: any) => s.ant || []).filter(Boolean);
      jmDict.field = senses.flatMap((s: any) => 
        (s.field || []).map((f: string) => this.mapToEnum(f, Field)).filter(Boolean)
      );
      jmDict.misc = senses.flatMap((s: any) => 
        (s.misc || []).map((m: string) => this.mapToEnum(m, MiscInfo)).filter(Boolean)
      );
      jmDict.s_inf = senses.flatMap((s: any) => s.s_inf || []).filter(Boolean);
      jmDict.lsource = senses.flatMap((s: any) => s.lsource || []).filter(Boolean);
      jmDict.dial = senses.flatMap((s: any) => 
        (s.dial || []).map((d: string) => this.mapToEnum(d, Dialect)).filter(Boolean)
      );
      jmDict.gloss = senses.flatMap((s: any) => {
        if (!s.gloss) return [];
        const glosses = Array.isArray(s.gloss) ? s.gloss : [s.gloss];
        return glosses.map((g: any) => {
          if (typeof g === 'string') return g;
          if (g && typeof g === 'object') {
            return g['#text'] || g['#cdata-section'] || '';
          }
          return '';
        }).filter(Boolean);
      });
      jmDict.example = senses.flatMap((s: any) => {
        if (!s.example) return [];
        const examples = Array.isArray(s.example) ? s.example : [s.example];
        return examples.map((ex: any) => {
          if (!ex || typeof ex !== 'object') return null;
          return {
            source: ex.ex_srce?.['#text'] || '',
            text: ex.ex_text?.['#text'] || '',
            sentences: Array.isArray(ex.ex_sent) 
              ? ex.ex_sent.map((sent: any) => sent['#text'] || '').filter(Boolean)
              : ex.ex_sent?.['#text'] ? [ex.ex_sent['#text']] : []
          };
        }).filter(Boolean);
      });
    } else {
      jmDict.pos = null;
      jmDict.xref = null;
      jmDict.ant = null;
      jmDict.field = null;
      jmDict.misc = null;
      jmDict.s_inf = null;
      jmDict.lsource = null;
      jmDict.dial = null;
      jmDict.gloss = null;
      jmDict.example = null;
    }

    // 确保所有数组字段在为空时返回 null 而不是空数组
    const arrayFields = [
      'keb', 'ke_inf', 'ke_pri', 'reb', 're_nokanji', 're_restr', 're_inf', 're_pri',
      'pos', 'xref', 'ant', 'field', 'misc', 's_inf', 'lsource', 'dial', 'gloss', 'example'
    ];
    
    for (const field of arrayFields) {
      if (Array.isArray(jmDict[field]) && jmDict[field].length === 0) {
        jmDict[field] = null;
      }
    }

    return jmDict;
  }

  /**
   * 将字符串映射到枚举值
   * @param value 要映射的字符串值
   * @param enumType 目标枚举类型
   * @returns 对应的枚举值
   */
  private mapToEnum<T extends { [key: string]: string }>(value: string, enumType: T): T[keyof T] | null {
    if (!value) return null;
    
    // 处理 XML 实体引用
    let cleanValue = value;
    if (value.startsWith('&')) {
      const entityName = value.slice(1, -1); // 移除 & 和 ;
      cleanValue = this.entityMap[entityName] || entityName;
    }
    
    // 直接查找枚举值
    const enumValue = enumType[cleanValue.toUpperCase() as keyof T];
    if (enumValue) {
      return enumValue as T[keyof T];
    }
    
    // 如果找不到，尝试查找原始值
    const originalValue = Object.values(enumType).find(v => v === cleanValue);
    if (originalValue) {
      return originalValue as T[keyof T];
    }
    
    console.warn(`Unknown enum value: ${value} (cleaned: ${cleanValue})`);
    return null;
  }

  /**
   * 创建用于处理 XML 数据的转换流
   * @returns 将 XML 数据块转换为 JMDict 实体的转换流
   */
  createTransformStream(): Transform {
    let buffer = '';
    let inEntry = false;

    return new Transform({
      objectMode: true,
      transform(chunk: Buffer, encoding, callback) {
        buffer += chunk.toString();

        while (true) {
          if (!inEntry) {
            const startIndex = buffer.indexOf('<entry>');
            if (startIndex === -1) {
              buffer = '';
              break;
            }
            buffer = buffer.slice(startIndex);
            inEntry = true;
          }

          const endIndex = buffer.indexOf('</entry>');
          if (endIndex === -1) {
            break;
          }

          const entryXml = buffer.slice(0, endIndex + 8);
          buffer = buffer.slice(endIndex + 8);
          inEntry = false;

          try {
            const parser = new JMDictParser();
            const jmDict = parser.parseEntry(entryXml);
            this.push(jmDict);
          } catch (error) {
            console.error('Error parsing entry:', error);
          }
        }

        callback();
      },
    });
  }

  /**
   * 从可读流解析 XML 数据
   * @param stream 包含 XML 数据的可读流
   * @returns 解析完成时解析的 Promise
   */
  async parseStream(stream: Readable): Promise<void> {
    return new Promise((resolve, reject) => {
      const transform = this.createTransformStream();

      transform.on('end', () => {
        resolve();
      });

      transform.on('error', (error) => {
        reject(error);
      });

      stream.pipe(transform);
    });
  }
} 