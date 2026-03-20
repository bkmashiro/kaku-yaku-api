# KakuYaku API

NestJS backend for the [KakuYaku Chrome extension](https://github.com/bkmashiro/kaku-yaku-ext). Provides Japanese text analysis, dictionary lookup, and LLM-powered explanations.

## Requirements

- Node.js 18+
- PostgreSQL 17 with [PGroonga](https://pgroonga.github.io/) extension
- Sudachi dictionary (system_small)

## Setup

```bash
npm install
```

### Environment

Copy `.env.example` to `.env` and fill in:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kakuyaku
DB_PASSWORD=kakuyaku123
DB_DATABASE=kakuyaku
DB_SYNC=true

# Sudachi tokenizer
DICTIONARY_PATH=/path/to/sudachi/system_small.dic

# LLM (DeepSeek / any OpenAI-compatible API)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# Skip data import on restart (set to true after first run)
LOAD_KANJI_DICT=false
LOAD_JM_DICT=false
LOAD_TATOEBA=false
LOAD_ANKI=false
```

### First Run (data import)

Set `LOAD_*=true` on the first startup to import dictionary data. This takes a few minutes. Set back to `false` afterwards.

Required data files (not included in repo, place in `data/`):

| File | Source |
|------|--------|
| `data/jmdict/JMdict_e` | [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project) |
| `data/kanjidic/kanjidic2.xml` | [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) |
| `data/tatoeba/jpn_sentences.tsv` | [Tatoeba](https://tatoeba.org/en/downloads) |
| `data/sudachi/...` | [Sudachi Dictionary](https://github.com/WorksApplications/SudachiDict) |

### Start

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build && npm run start:prod
```

## API Endpoints

### Analysis

```
GET /api/analysis/quick?sentence=<text>
```

Returns tokenized sentence with Sudachi analysis + JMDict lookup for each token.

### LLM

```
POST /api/llm/explain-grammar
Body: { sentence, targetWord, lang? }
→ { role, function, rule, example, exampleTrans }

POST /api/llm/translate
Body: { sentence, lang? }
→ { translation, chunks: [{ jp, en }] }
```

`lang` defaults to `"English"`. Accepts any language name (e.g. `"中文"`, `"日本語"`).

### Dictionary

```
GET /api/dictionary/kanji/:character
GET /api/dictionary/word/:term
```

## Architecture

```
src/
├── modules/
│   ├── analysis/       Sudachi tokenizer bridge (native Node module)
│   ├── dictionary/     JMDict + KANJIDIC2 PostgreSQL lookup
│   ├── llm/            DeepSeek/OpenAI grammar + translation
│   └── tatoeba/        Example sentence search
└── app.module.ts
```

## License

MIT
