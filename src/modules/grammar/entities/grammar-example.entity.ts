import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { GrammarRule } from './grammar-rule.entity';

@Entity('grammar_examples')
export class GrammarExample {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => GrammarRule, (rule) => rule.examples)
  rule: GrammarRule;

  @Column()
  japanese: string;

  @Column({ nullable: true })
  translation: string;

  @Column({ nullable: true })
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;
}
