import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meaning } from './meaning.entity';
import { Example } from './example.entity';
import { Conjugation } from './conjugation.entity';

@Entity('entries')
export class Entry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  surfaceForm: string;

  @Column()
  reading: string;

  @Column()
  pos: string;

  @Column({ nullable: true })
  jlptLevel: number;

  @OneToMany(() => Meaning, (meaning) => meaning.entry)
  meanings: Meaning[];

  @OneToMany(() => Example, (example) => example.entry)
  examples: Example[];

  @OneToMany(() => Conjugation, (conjugation) => conjugation.entry)
  conjugations: Conjugation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
