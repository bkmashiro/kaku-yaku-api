import {
    Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { AnkiVocab } from './anki-vocab.entity';

@Entity('anki-sentence')
export class AnkiSentence {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => AnkiVocab, vocab => vocab.sentences, { onDelete: 'CASCADE' })
    @JoinColumn()
    vocab: AnkiVocab;

    @Column()
    index: number;

    @Column({ nullable: true })
    kanji: string;

    @Column({ nullable: true })
    furigana: string;

    @Column({ nullable: true })
    definitionCn: string;

    @Column({ nullable: true })
    definitionTc: string;

    @Column({ nullable: true })
    audioUrl: string;
}
