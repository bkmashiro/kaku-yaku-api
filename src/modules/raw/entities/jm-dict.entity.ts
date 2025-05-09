import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

/**
 * 方言类型枚举
 */
export enum Dialect {
  BRAZILIAN = 'bra',
  HOKKAIDO = 'hob',
  KANSAI = 'ksb',
  KANTOU = 'ktb',
  KYOTO = 'kyb',
  KYUSHUU = 'kyu',
  NAGANO = 'nab',
  OSAKA = 'osb',
  RYUKYU = 'rkb',
  TOHOKU = 'thb',
  TOSA = 'tsb',
  TSUGARU = 'tsug',
}

/**
 * 使用领域枚举
 */
export enum Field {
  AGRICULTURE = 'agric',
  ANATOMY = 'anat',
  ARCHEOLOGY = 'archeol',
  ARCHITECTURE = 'archit',
  ART = 'art',
  ASTRONOMY = 'astron',
  AUDIOVISUAL = 'audvid',
  AVIATION = 'aviat',
  BASEBALL = 'baseb',
  BIOCHEMISTRY = 'biochem',
  BIOLOGY = 'biol',
  BOTANY = 'bot',
  BOXING = 'boxing',
  BUDDHISM = 'Buddh',
  BUSINESS = 'bus',
  CARD_GAMES = 'cards',
  CHEMISTRY = 'chem',
  CHINESE_MYTHOLOGY = 'chmyth',
  CHRISTIANITY = 'Christn',
  CIVIL_ENGINEERING = 'civeng',
  CLOTHING = 'cloth',
  COMPUTING = 'comp',
  CRYSTALLOGRAPHY = 'cryst',
  DENTISTRY = 'dent',
  ECOLOGY = 'ecol',
  ECONOMICS = 'econ',
  ELECTRICITY = 'elec',
  ELECTRONICS = 'electr',
  EMBRYOLOGY = 'embryo',
  ENGINEERING = 'engr',
  ENTOMOLOGY = 'ent',
  FIGURE_SKATING = 'figskt',
  FILM = 'film',
  FINANCE = 'finc',
  FISHING = 'fish',
  FOOD = 'food',
  GARDENING = 'gardn',
  GENETICS = 'genet',
  GEOGRAPHY = 'geogr',
  GEOLOGY = 'geol',
  GEOMETRY = 'geom',
  GO = 'go',
  GOLF = 'golf',
  GRAMMAR = 'gramm',
  GREEK_MYTHOLOGY = 'grmyth',
  HANAFUDA = 'hanaf',
  HORSE_RACING = 'horse',
  INTERNET = 'internet',
  JAPANESE_MYTHOLOGY = 'jpmyth',
  KABUKI = 'kabuki',
  LAW = 'law',
  LINGUISTICS = 'ling',
  LOGIC = 'logic',
  MARTIAL_ARTS = 'MA',
  MAHJONG = 'mahj',
  MANGA = 'manga',
  MATHEMATICS = 'math',
  MECHANICAL_ENGINEERING = 'mech',
  MEDICINE = 'med',
  METEOROLOGY = 'met',
  MILITARY = 'mil',
  MINERALOGY = 'min',
  MINING = 'mining',
  MOTORSPORT = 'motor',
  MUSIC = 'music',
  NOH = 'noh',
  ORNITHOLOGY = 'ornith',
  PALEONTOLOGY = 'paleo',
  PATHOLOGY = 'pathol',
  PHARMACOLOGY = 'pharm',
  PHILOSOPHY = 'phil',
  PHOTOGRAPHY = 'photo',
  PHYSICS = 'physics',
  PHYSIOLOGY = 'physiol',
  POLITICS = 'politics',
  PRINTING = 'print',
  PROFESSIONAL_WRESTLING = 'prowres',
  PSYCHIATRY = 'psy',
  PSYCHOANALYSIS = 'psyanal',
  PSYCHOLOGY = 'psych',
  RAILWAY = 'rail',
  ROMAN_MYTHOLOGY = 'rommyth',
  SHINTO = 'Shinto',
  SHOGI = 'shogi',
  SKIING = 'ski',
  SPORTS = 'sports',
  STATISTICS = 'stat',
  STOCK_MARKET = 'stockm',
  SUMO = 'sumo',
  SURGERY = 'surg',
  TELECOMMUNICATIONS = 'telec',
  TRADEMARK = 'tradem',
  TELEVISION = 'tv',
  VETERINARY = 'vet',
  VIDEO_GAMES = 'vidg',
  ZOOLOGY = 'zool',
}

/**
 * 汉字信息枚举
 */
export enum KanjiInfo {
  ATEJI = 'ateji',
  IRREGULAR_KANA = 'ik',
  IRREGULAR_KANJI = 'iK',
  IRREGULAR_OKURIGANA = 'io',
  OUTDATED_KANJI = 'oK',
  RARE_KANJI = 'rK',
  SEARCH_ONLY = 'sK',
}

/**
 * 其他信息枚举
 */
export enum MiscInfo {
  ABBREVIATION = 'abbr',
  ARCHAIC = 'arch',
  CHARACTER = 'char',
  CHILDRENS_LANGUAGE = 'chn',
  COLLOQUIAL = 'col',
  COMPANY_NAME = 'company',
  CREATURE = 'creat',
  DATED = 'dated',
  DEITY = 'dei',
  DEROGATORY = 'derog',
  DOCUMENT = 'doc',
  EUPHEMISTIC = 'euph',
  EVENT = 'ev',
  FAMILIAR = 'fam',
  FEMALE = 'fem',
  FICTION = 'fict',
  FORMAL = 'form',
  GIVEN_NAME = 'given',
  GROUP = 'group',
  HISTORICAL = 'hist',
  HONORIFIC = 'hon',
  HUMBLE = 'hum',
  IDIOMATIC = 'id',
  JOCULAR = 'joc',
  LEGEND = 'leg',
  MANGA_SLANG = 'm-sl',
  MALE = 'male',
  MYTHOLOGY = 'myth',
  INTERNET_SLANG = 'net-sl',
  OBJECT = 'obj',
  OBSOLETE = 'obs',
  ONOMATOPOEIC = 'on-mim',
  ORGANIZATION = 'organization',
  OTHER = 'oth',
  PERSON = 'person',
  PLACE = 'place',
  POETICAL = 'poet',
  POLITE = 'pol',
  PRODUCT = 'product',
  PROVERB = 'proverb',
  QUOTATION = 'quote',
  RARE = 'rare',
  RELIGION = 'relig',
  SENSITIVE = 'sens',
  SERVICE = 'serv',
  SHIP = 'ship',
  SLANG = 'sl',
  STATION = 'station',
  SURNAME = 'surname',
  KANA_ONLY = 'uk',
  UNCLASSIFIED = 'unclass',
  VULGAR = 'vulg',
  WORK = 'work',
  RUDE = 'X',
  YOJIJUKUGO = 'yoji',
}

/**
 * 词性枚举
 */
export enum PartOfSpeech {
  NOUN = 'n',
  ADJ_F = 'adj-f',
  ADJ_I = 'adj-i',
  ADJ_IX = 'adj-ix',
  ADJ_KARI = 'adj-kari',
  ADJ_KU = 'adj-ku',
  ADJ_NA = 'adj-na',
  ADJ_NARI = 'adj-nari',
  ADJ_NO = 'adj-no',
  ADJ_PN = 'adj-pn',
  ADJ_SHIKU = 'adj-shiku',
  ADJ_T = 'adj-t',
  ADV = 'adv',
  ADV_TO = 'adv-to',
  AUX = 'aux',
  AUX_ADJ = 'aux-adj',
  AUX_V = 'aux-v',
  CONJ = 'conj',
  COP = 'cop',
  CTR = 'ctr',
  EXP = 'exp',
  INT = 'int',
  N_ADV = 'n-adv',
  N_PR = 'n-pr',
  N_PREF = 'n-pref',
  N_SUF = 'n-suf',
  N_T = 'n-t',
  NUM = 'num',
  PN = 'pn',
  PREF = 'pref',
  PRT = 'prt',
  SUF = 'suf',
  UNC = 'unc',
  V_UNSPEC = 'v-unspec',
  V1 = 'v1',
  V1_S = 'v1-s',
  V2A_S = 'v2a-s',
  V2B_K = 'v2b-k',
  V2B_S = 'v2b-s',
  V2D_K = 'v2d-k',
  V2D_S = 'v2d-s',
  V2G_K = 'v2g-k',
  V2G_S = 'v2g-s',
  V2H_K = 'v2h-k',
  V2H_S = 'v2h-s',
  V2K_K = 'v2k-k',
  V2K_S = 'v2k-s',
  V2M_K = 'v2m-k',
  V2M_S = 'v2m-s',
  V2N_S = 'v2n-s',
  V2R_K = 'v2r-k',
  V2R_S = 'v2r-s',
  V2S_S = 'v2s-s',
  V2T_K = 'v2t-k',
  V2T_S = 'v2t-s',
  V2W_S = 'v2w-s',
  V2Y_K = 'v2y-k',
  V2Y_S = 'v2y-s',
  V2Z_S = 'v2z-s',
  V4B = 'v4b',
  V4G = 'v4g',
  V4H = 'v4h',
  V4K = 'v4k',
  V4M = 'v4m',
  V4N = 'v4n',
  V4R = 'v4r',
  V4S = 'v4s',
  V4T = 'v4t',
  V5ARU = 'v5aru',
  V5B = 'v5b',
  V5G = 'v5g',
  V5K = 'v5k',
  V5K_S = 'v5k-s',
  V5M = 'v5m',
  V5N = 'v5n',
  V5R = 'v5r',
  V5R_I = 'v5r-i',
  V5S = 'v5s',
  V5T = 'v5t',
  V5U = 'v5u',
  V5U_S = 'v5u-s',
  V5URU = 'v5uru',
  VI = 'vi',
  VK = 'vk',
  VN = 'vn',
  VR = 'vr',
  VS = 'vs',
  VS_C = 'vs-c',
  VS_I = 'vs-i',
  VS_S = 'vs-s',
  VT = 'vt',
  VZ = 'vz',
}

/**
 * 读音信息枚举
 */
export enum ReadingInfo {
  GIKUN = 'gikun',
  IRREGULAR_KANA = 'ik',
  OUTDATED_KANA = 'ok',
  RARE_KANA = 'rk',
  SEARCH_ONLY = 'sk',
}

/**
 * JMdict 实体类
 * 用于存储日语词典数据，包含词条、读音、释义等信息
 * 基于 JMdict XML 格式定义
 */
@Entity()
export class JMDict {
  /**
   * 词条序号
   * 每个词条的唯一标识符
   */
  @PrimaryColumn()
  ent_seq: number;

  /**
   * 汉字表记
   * 词条的汉字写法，可能包含多个变体
   */
  @Index()
  @Column('simple-array', { nullable: true })
  keb: string[];

  /**
   * 汉字信息
   * 关于汉字表记的特殊信息，如不常用写法、特殊用法等
   */
  @Column('enum', { array: true, enum: KanjiInfo, nullable: true })
  ke_inf: KanjiInfo[];

  /**
   * 汉字优先级
   * 表示该汉字表记在参考词典中的优先级
   */
  @Column('simple-array', { nullable: true })
  ke_pri: string[];

  /**
   * 假名读音
   * 词条的假名读音，至少包含一个读音
   */
  @Index()
  @Column('simple-array')
  reb: string[];

  /**
   * 无汉字标记
   * 表示该读音没有对应的汉字表记
   */
  @Column('simple-array', { nullable: true })
  re_nokanji: string[];

  /**
   * 读音限制
   * 限制该读音只适用于特定的汉字表记
   */
  @Column('simple-array', { nullable: true })
  re_restr: string[];

  /**
   * 读音信息
   * 关于读音的特殊信息，如特殊读法、罕用读法等
   */
  @Column('enum', { array: true, enum: ReadingInfo, nullable: true })
  re_inf: ReadingInfo[];

  /**
   * 读音优先级
   * 表示该读音在参考词典中的优先级
   */
  @Column('simple-array', { nullable: true })
  re_pri: string[];

  /**
   * 词性
   * 词条的语法分类，如名词、动词、形容词等
   */
  @Index()
  @Column('enum', { array: true, enum: PartOfSpeech, nullable: true })
  pos: PartOfSpeech[];

  /**
   * 交叉引用
   * 指向其他相关词条的引用
   */
  @Column('simple-array', { nullable: true })
  xref: string[];

  /**
   * 反义词
   * 词条的反义词列表
   */
  @Column('simple-array', { nullable: true })
  ant: string[];

  /**
   * 使用领域
   * 词条的使用领域，如计算机、医学、体育等
   */
  @Index()
  @Column('enum', { array: true, enum: Field, nullable: true })
  field: Field[];

  /**
   * 其他信息
   * 词条的其他相关信息，如口语、书面语、古语等
   */
  @Index()
  @Column('enum', { array: true, enum: MiscInfo, nullable: true })
  misc: MiscInfo[];

  /**
   * 释义信息
   * 关于释义的补充信息
   */
  @Column('simple-array', { nullable: true })
  s_inf: string[];

  /**
   * 词源
   * 外来词的来源语言信息
   */
  @Column('simple-array', { nullable: true })
  lsource: string[];

  /**
   * 方言
   * 词条使用的方言信息
   */
  @Index()
  @Column('enum', { array: true, enum: Dialect, nullable: true })
  dial: Dialect[];

  /**
   * 释义
   * 词条的释义，包含目标语言的翻译
   */
  @Index()
  @Column('simple-array', { nullable: true })
  gloss: string[];

  /**
   * 例句
   * 词条的使用例句
   */
  @Column('simple-json', { nullable: true })
  example: Array<{
    source: string;
    text: string;
    sentences: string[];
  }>;
} 