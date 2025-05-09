import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * Kanji Dictionary Entity
 *
 * This entity represents a kanji character with all its associated information
 * from the KANJIDIC/KANJIDIC2 dictionary format.
 *
 * The data structure follows the KANJIDIC2 XML format specification, which includes:
 * - Basic character information (literal, codepoints)
 * - Dictionary references (Nelson, Halpern, etc.)
 * - Reading information (on/kun readings, nanori)
 * - Meaning information
 * - Classification codes (SKIP, Four Corner, etc.)
 * - Educational information (grade, JLPT level)
 */
@Entity('kanji_dict')
export class KanjiDict {
  /**
   * The kanji character itself
   * Primary key of the entity
   */
  @PrimaryColumn()
  literal: string;

  /**
   * JIS code-point in hexadecimal form
   * Example: "3021" for 亜
   */
  @Column({ nullable: true })
  jisCode: string;

  /**
   * Unicode code-point
   */
  @Column({ nullable: true })
  unicode: string;

  /**
   * Classical radical number
   */
  @Column({ nullable: true })
  classicalRadical: number;

  /**
   * Nelson radical number
   */
  @Column({ nullable: true })
  nelsonRadical: number;

  /**
   * Grade level of the kanji
   * G1-G6: Elementary school (kyōiku kanji)
   * G8: Secondary school (remaining jōyō kanji)
   * G9: Regular jinmeiyō kanji
   * G10: Variant jinmeiyō kanji
   */
  @Column({ nullable: true })
  grade: string;

  /**
   * Stroke count of the kanji
   */
  @Column({ nullable: true })
  strokeCount: number;

  /**
   * Frequency-of-use ranking (1-2501)
   * Based on analysis of Mainichi Shimbun newspaper
   */
  @Column({ nullable: true })
  frequency: number;

  /**
   * JLPT level (pre-2010)
   * 1-4: Old JLPT levels
   */
  @Column({ nullable: true })
  jlptLevel: number;

  /**
   * Nelson (Classic) dictionary number
   */
  @Column({ nullable: true })
  nelsonClassic: number;

  /**
   * Nelson (New) dictionary number
   */
  @Column({ nullable: true })
  nelsonNew: number;

  /**
   * NJECD (New Japanese-English Character Dictionary) number
   */
  @Column({ nullable: true })
  njecd: number;

  /**
   * Kodansha Kanji Dictionary number
   */
  @Column({ nullable: true })
  kodanshaKanji: number;

  /**
   * Kanji Learners Dictionary number
   */
  @Column({ nullable: true })
  kanjiLearners: number;

  /**
   * Remembering The Kanji number
   */
  @Column({ nullable: true })
  heisig: number;

  /**
   * SKIP code (System of Kanji Indexing by Patterns)
   * Format: "l-m-n"
   */
  @Column({ nullable: true })
  skipCode: string;

  /**
   * Four Corner code
   */
  @Column({ nullable: true })
  fourCorner: string;

  /**
   * De Roo code
   */
  @Column({ nullable: true })
  deRoo: string;

  /**
   * Chinese reading (Pinyin)
   */
  @Column({ nullable: true })
  pinyin: string;

  /**
   * Korean reading (romanized)
   */
  @Column({ nullable: true })
  koreanR: string;

  /**
   * Korean reading (hangul)
   */
  @Column({ nullable: true })
  koreanH: string;

  /**
   * Vietnamese reading (chữ quốc ngữ)
   */
  @Column({ nullable: true })
  vietnamese: string;

  /**
   * Japanese on readings (音読み) in katakana
   * Stored as JSON array
   */
  @Column('simple-json', { nullable: true })
  onReadings: string[];

  /**
   * Japanese kun readings (訓読み) in hiragana
   * Stored as JSON array
   */
  @Column('simple-json', { nullable: true })
  kunReadings: string[];

  /**
   * Name readings (nanori) in hiragana
   * Stored as JSON array
   */
  @Column('simple-json', { nullable: true })
  nanori: string[];

  /**
   * Meanings in different languages
   * Stored as JSON object with language codes as keys
   * Example: { "en": ["meaning1", "meaning2"], "fr": ["sens1", "sens2"] }
   */
  @Column('simple-json', { nullable: true })
  meanings: Record<string, string[]>;

  /**
   * Variant kanji codes
   * Stored as JSON object with variant types as keys
   */
  @Column('simple-json', { nullable: true })
  variants: {
    jis208?: string;
    jis212?: string;
    jis213?: string;
    deroo?: string;
    halpern_njecd?: string;
    s_h?: string;
    nelson_c?: string;
    oneill?: string;
  };
}
