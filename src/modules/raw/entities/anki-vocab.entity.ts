import {
    Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn
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

    @Column({ nullable: true, type: 'text', array: true })
    jlpt: string[];

    @Column({ name: 'review_count', type: 'int', default: 0 })
    reviewCount: number;

    @Column({ name: 'is_known', type: 'boolean', default: false })
    isKnown: boolean;

    @Column({ name: 'added_at', type: 'timestamp', default: () => 'now()' })
    addedAt: Date;

    @Column({ name: 'interval_days', type: 'int', default: 1 })
    intervalDays: number;

    @Column({ name: 'next_review', type: 'timestamp', nullable: true })
    nextReview: Date | null;

    @OneToMany(() => AnkiSentence, sentence => sentence.vocab, {
        onDelete: 'CASCADE',
        cascade: true
    })
    sentences: AnkiSentence[];
}
