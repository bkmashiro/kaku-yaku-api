import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

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
   * Explain a grammar point in context
   */
  async explainGrammar(sentence: string, targetWord: string): Promise<string> {
    const prompt = `You are a Japanese language tutor. The student is reading: "${sentence}"

They want to understand the usage of "${targetWord}" in this context.

Please explain:
1. What grammar pattern or role "${targetWord}" plays
2. How it functions in this sentence
3. A simple rule to remember this usage
4. One similar example sentence

Reply in English. Be concise (under 150 words).`;

    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 350,
      });
      return res.choices[0].message.content || '';
    } catch (error) {
      this.logger.error(`explainGrammar failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Translate a Japanese sentence with breakdown
   */
  async translateSentence(
    sentence: string,
  ): Promise<{ translation: string; breakdown: string }> {
    const prompt = `Translate this Japanese sentence naturally: "${sentence}"

Respond in JSON:
{
  "translation": "natural English translation",
  "breakdown": "brief chunk-by-chunk breakdown showing how the meaning is built"
}`;

    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 400,
      });
      const content =
        res.choices[0].message.content || '{"translation":"","breakdown":""}';
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`translateSentence failed: ${error.message}`);
      throw error;
    }
  }
}
