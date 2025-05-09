import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

/**
 * Tatoeba 例句实体
 * 用于存储 Tatoeba 项目中的例句数据
 */
@Entity('tatoeba_sentences')
export class TatoebaSentence {
  /**
   * 例句 ID
   * Tatoeba 项目中的唯一标识符
   */
  @PrimaryColumn()
  id: number;

  /**
   * 例句语言
   * 使用 ISO 639-3 语言代码
   */
  @Column()
  @Index()
  lang: string;

  /**
   * 例句内容
   * 使用 GIN 索引支持全文搜索
   */
  @Column('text')
  text: string;

  /**
   * 创建时间
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  /**
   * 更新时间
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
