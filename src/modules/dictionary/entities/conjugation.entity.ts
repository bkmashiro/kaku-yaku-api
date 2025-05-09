import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Entry } from './entry.entity';

@Entity('conjugations')
export class Conjugation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Entry, (entry) => entry.conjugations)
  entry: Entry;

  @Column()
  formType: string;

  @Column()
  surfaceForm: string;

  @CreateDateColumn()
  createdAt: Date;
}
