import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

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
    const prompt = `You are a Japanese language tutor. The student is reading:
"${sentence}"

Explain the word/pattern "${targetWord}" in this context.

Respond ONLY with valid JSON (no markdown). Use ${lang} for all text values:
{
  "role": "grammar role or part of speech in one short phrase",
  "function": "one sentence: how it functions in this specific sentence",
  "rule": "one sentence: the general rule or pattern to remember",
  "example": "one Japanese example sentence using this pattern",
  "exampleTrans": "translation of the example in ${lang}"
}`;

    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 300,
      });
      const content = res.choices[0].message.content || '{}';
      return JSON.parse(extractJson(content));
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
    const prompt = `Translate this Japanese sentence into ${lang}: "${sentence}"

Respond ONLY with valid JSON (no markdown):
{
  "translation": "natural ${lang} translation",
  "chunks": [
    { "jp": "Japanese chunk", "en": "${lang} meaning" }
  ]
}

Split into 3-6 meaningful chunks.`;

    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 400,
      });
      const content = res.choices[0].message.content || '{"translation":"","chunks":[]}';
      return JSON.parse(extractJson(content));
    } catch (error) {
      this.logger.error(`translateSentence failed: ${error.message}`);
      throw error;
    }
  }
}
