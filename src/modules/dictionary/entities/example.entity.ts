import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Entry } from './entry.entity';

@Entity('examples')
export class Example {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Entry, (entry) => entry.examples)
  entry: Entry;

  @Column()
  japanese: string;

  @Column({ nullable: true })
  translation: string;

  @Column({ nullable: true })
  source: string;

  @CreateDateColumn()
  createdAt: Date;
}
