import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { GrammarExample } from './grammar-example.entity';

@Entity('grammar_rules')
export class GrammarRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  jlptLevel: number;

  @OneToMany(() => GrammarExample, (example) => example.rule)
  examples: GrammarExample[];

  @CreateDateColumn()
  createdAt: Date;
}
