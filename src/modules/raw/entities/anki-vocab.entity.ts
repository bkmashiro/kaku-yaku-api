import {
    Entity, Column, PrimaryGeneratedColumn, OneToMany
} from 'typeorm';
import { AnkiSentence } from './anki-sentence.entity';

@Entity('anki-vocab')
export class AnkiVocab {
    @PrimaryGeneratedColumn('uuid')
    noteId: string;

    @Column()
    kanji: string;

    @Column({ nullable: true })
    pitch: string;

    @Column("text", { nullable: true, array: true })
    pos: string[];

    @Column({ nullable: true })
    reading: string;

    @Column({ nullable: true })
    definitionCn: string;

    @Column({ nullable: true })
    definitionTc: string;

    @Column({ nullable: true })
    plusInfo: string;

    @Column({ nullable: true })
    audioUrl: string;

    @Column({ type: 'int', nullable: true })
    frequency: number;

    @Column({ nullable: true })
    alt1: string;

    @Column({ nullable: true })
    alt2: string;

    @Column({ nullable: true, type: 'simple-array' })
    jlpt: string[];

    @OneToMany(() => AnkiSentence, sentence => sentence.vocab, {
        onDelete: 'CASCADE',
        cascade: true
    })
    sentences: AnkiSentence[];
}
