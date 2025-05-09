import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Entry } from './entry.entity';

@Entity('meanings')
export class Meaning {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Entry, (entry) => entry.meanings)
  entry: Entry;

  @Column()
  meaning: string;

  @Column({ default: 'zh' })
  language: string;

  @CreateDateColumn()
  createdAt: Date;
}
