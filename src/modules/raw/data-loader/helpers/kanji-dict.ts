import { XMLParser } from 'fast-xml-parser';
import { KanjiDict } from '../../entities/kanji-dict.entity';
import { Readable } from 'stream';
import { Transform } from 'stream';

/**
 * Kanji Dictionary XML Parser
 *
 * This class provides efficient parsing of KANJIDIC2 XML data into KanjiDict entities.
 * It uses fast-xml-parser for high-performance XML parsing and implements streaming
 * for memory-efficient processing of large files.
 */
export class KanjiDictParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      isArray: (name) => {
        return [
          'cp_value',
          'rad_value',
          'variant',
          'dic_ref',
          'q_code',
          'reading',
          'meaning',
          'nanori',
        ].includes(name);
      },
    });
  }

  /**
   * Safely parse a string to integer, returning null if invalid
   */
  private safeParseInt(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse a single kanji character entry from XML
   * @param xmlString XML string containing a single character entry
   * @returns Parsed KanjiDict entity
   */
  parseCharacter(xmlString: string): KanjiDict {
    const parsed = this.parser.parse(xmlString);
    const char = parsed.character;

    const kanjiDict = new KanjiDict();
    kanjiDict.literal = char.literal;

    // Parse codepoints
    if (char.codepoint?.cp_value) {
      for (const cp of char.codepoint.cp_value) {
        if (cp['@_cp_type'] === 'ucs') {
          kanjiDict.unicode = cp['#text'];
        } else if (cp['@_cp_type'] === 'jis208') {
          kanjiDict.jisCode = cp['#text'];
        }
      }
    }

    // Parse radicals
    if (char.radical?.rad_value) {
      for (const rad of char.radical.rad_value) {
        if (rad['@_rad_type'] === 'classical') {
          kanjiDict.classicalRadical = this.safeParseInt(rad['#text']);
        } else if (rad['@_rad_type'] === 'nelson_c') {
          kanjiDict.nelsonRadical = this.safeParseInt(rad['#text']);
        }
      }
    }

    // Parse misc information
    if (char.misc) {
      kanjiDict.grade = char.misc.grade;
      kanjiDict.strokeCount = this.safeParseInt(char.misc.stroke_count);
      kanjiDict.frequency = this.safeParseInt(char.misc.freq);
      kanjiDict.jlptLevel = this.safeParseInt(char.misc.jlpt);
    }

    // Parse dictionary numbers
    if (char.dic_number?.dic_ref) {
      for (const ref of char.dic_number.dic_ref) {
        const type = ref['@_dr_type'];
        const value = ref['#text'];

        switch (type) {
          case 'nelson_c':
            kanjiDict.nelsonClassic = this.safeParseInt(value);
            break;
          case 'nelson_n':
            kanjiDict.nelsonNew = this.safeParseInt(value);
            break;
          case 'halpern_njecd':
            kanjiDict.njecd = this.safeParseInt(value);
            break;
          case 'halpern_kkld':
            kanjiDict.kanjiLearners = this.safeParseInt(value);
            break;
          case 'heisig':
            kanjiDict.heisig = this.safeParseInt(value);
            break;
        }
      }
    }

    // Parse query codes
    if (char.query_code?.q_code) {
      for (const code of char.query_code.q_code) {
        const type = code['@_qc_type'];
        const value = code['#text'];

        switch (type) {
          case 'skip':
            kanjiDict.skipCode = value;
            break;
          case 'four_corner':
            kanjiDict.fourCorner = value;
            break;
          case 'deroo':
            kanjiDict.deRoo = value;
            break;
        }
      }
    }

    // Parse readings and meanings
    if (char.reading_meaning) {
      const rmgroup = char.reading_meaning.rmgroup;

      // Parse readings
      if (rmgroup?.reading) {
        kanjiDict.onReadings = [];
        kanjiDict.kunReadings = [];
        kanjiDict.pinyin = '';
        kanjiDict.koreanR = '';
        kanjiDict.koreanH = '';

        for (const reading of rmgroup.reading) {
          const type = reading['@_r_type'];
          const value = reading['#text'];

          switch (type) {
            case 'ja_on':
              kanjiDict.onReadings.push(value);
              break;
            case 'ja_kun':
              kanjiDict.kunReadings.push(value);
              break;
            case 'pinyin':
              kanjiDict.pinyin = value;
              break;
            case 'korean_r':
              kanjiDict.koreanR = value;
              break;
            case 'korean_h':
              kanjiDict.koreanH = value;
              break;
          }
        }
      }

      // Parse meanings
      if (rmgroup?.meaning) {
        kanjiDict.meanings = {};

        for (const meaning of rmgroup.meaning) {
          const lang = meaning['@_m_lang'] || 'en';
          if (!kanjiDict.meanings[lang]) {
            kanjiDict.meanings[lang] = [];
          }
          kanjiDict.meanings[lang].push(meaning['#text']);
        }
      }

      // Parse nanori
      if (char.reading_meaning.nanori) {
        kanjiDict.nanori = Array.isArray(char.reading_meaning.nanori)
          ? char.reading_meaning.nanori
          : [char.reading_meaning.nanori];
      }
    }

    return kanjiDict;
  }

  /**
   * Create a transform stream for processing XML data
   * @returns Transform stream that converts XML chunks to KanjiDict entities
   */
  createTransformStream(): Transform {
    let buffer = '';
    let inCharacter = false;

    return new Transform({
      objectMode: true,
      transform(chunk: Buffer, encoding, callback) {
        buffer += chunk.toString();

        while (true) {
          if (!inCharacter) {
            const startIndex = buffer.indexOf('<character>');
            if (startIndex === -1) {
              buffer = '';
              break;
            }
            buffer = buffer.slice(startIndex);
            inCharacter = true;
          }

          const endIndex = buffer.indexOf('</character>');
          if (endIndex === -1) {
            break;
          }

          const characterXml = buffer.slice(0, endIndex + 12);
          buffer = buffer.slice(endIndex + 12);
          inCharacter = false;

          try {
            const parser = new KanjiDictParser();
            const kanjiDict = parser.parseCharacter(characterXml);
            this.push(kanjiDict);
          } catch (error) {
            console.error('Error parsing character:', error);
          }
        }

        callback();
      },
    });
  }

  /**
   * Parse XML data from a readable stream
   * @param stream Readable stream containing XML data
   * @returns Promise that resolves when parsing is complete
   */
  async parseStream(stream: Readable): Promise<KanjiDict[]> {
    return new Promise((resolve, reject) => {
      const results: KanjiDict[] = [];
      const transform = this.createTransformStream();

      transform.on('data', (kanjiDict: KanjiDict) => {
        results.push(kanjiDict);
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
