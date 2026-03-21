import { IsBoolean } from 'class-validator';

export class ReviewVocabDto {
  @IsBoolean()
  known: boolean;
}
