import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface GrammarExplanation {
  role: string;        // 词性/语法角色，e.g. "Counter suffix"
  function: string;    // 在句中的作用
  rule: string;        // 记忆规律
  example: string;     // 例句（日语）
  exampleTrans: string; // 例句翻译
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
  }

  private get model(): string {
    return process.env.LLM_MODEL || 'gpt-4o-mini';
  }

  /**
   * Explain a grammar point in context — returns structured JSON
   */
  async explainGrammar(sentence: string, targetWord: string, lang = 'English'): Promise<GrammarExplanation> {
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a Japanese language tutor. Always respond with valid JSON only. Use ${lang} for all explanatory text. JSON schema: { "role": string, "function": string, "rule": string, "example": string (Japanese), "exampleTrans": string }`,
          },
          {
            role: 'user',
            content: `Sentence: "${sentence}"\nExplain the word/pattern: "${targetWord}"`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
      });
      const content = res.choices[0].message.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`explainGrammar failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Translate a Japanese sentence with word-by-word breakdown
   */
  async translateSentence(
    sentence: string,
    lang = 'English',
  ): Promise<{ translation: string; chunks: Array<{ jp: string; en: string }> }> {
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a Japanese translator. Always respond with valid JSON only. Translate into ${lang}. JSON schema: { "translation": string, "chunks": [{ "jp": string, "en": string }] }. Split into 3-6 meaningful chunks.`,
          },
          {
            role: 'user',
            content: `Translate: "${sentence}"`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 400,
      });
      const content = res.choices[0].message.content || '{"translation":"","chunks":[]}';
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`translateSentence failed: ${error.message}`);
      throw error;
    }
  }
}
