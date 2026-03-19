import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LlmService } from './llm.service';

class ExplainGrammarDto {
  sentence: string;
  targetWord: string;
  lang?: string;
}

class TranslateDto {
  sentence: string;
}

@ApiTags('LLM')
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @ApiOperation({ summary: '解释句子中某词的语法用法' })
  @Post('explain-grammar')
  async explainGrammar(@Body() dto: ExplainGrammarDto) {
    return await this.llmService.explainGrammar(dto.sentence, dto.targetWord, dto.lang);
  }

  @ApiOperation({ summary: '翻译日语句子，附带逐块解析' })
  @Post('translate')
  async translate(@Body() dto: TranslateDto) {
    return await this.llmService.translateSentence(dto.sentence);
  }
}
