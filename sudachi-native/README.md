# Sudachi Native

Node.js binding for Sudachi Japanese morphological analyzer.

## Installation

```bash
npm install sudachi-native
```

## Usage

```javascript
const { SudachiTokenizer, SudachiMode } = require('sudachi-native');

function main() {
  try {
    // 创建一个分词器 (可选参数：configPath, resourceDir, dictionaryPath)
    const tokenizer = new SudachiTokenizer();
    
    // 基本分词 (返回详细的形态素对象数组)
    // Mode: A=0 (短单位), B=1 (中单位), C=2 (长单位)
    const tokens = tokenizer.tokenize('日本語の形態素解析器です。', SudachiMode.C, true);
    console.log(tokens);
    // [{surface: '日本語', dictionary_form: '日本語', ...}, ...]
    
    // 获取标准格式输出
    const output = tokenizer.tokenize_to_string('日本語の形態素解析器です。', 
      SudachiMode.C, false, true);
    console.log(output);
    // 日本語	名詞,固有名詞,地名,国	日本語
    // ...
    // EOS
    
    // 获取分词格式输出
    const wakati = tokenizer.tokenize_to_string('日本語の形態素解析器です。',
      SudachiMode.C, true, false);
    console.log(wakati);
    // '日本語 の 形態素解析器 です 。'
    
    // 句子分割
    const sentences = tokenizer.split_sentences(
      '吾輩は猫である。名前はまだ無い。'
    );
    console.log(sentences);
    // ['吾輩は猫である。', '名前はまだ無い。']
  } catch (error) {
    console.error(error);
  }
}

main();
```

## 字典构建示例

```javascript
const { DictionaryBuilder } = require('sudachi-native');

function buildDictionary() {
  try {
    // 创建字典构建器
    const builder = new DictionaryBuilder();
    
    // 设置描述信息
    builder.set_description("My custom dictionary");
    
    // 添加词典文件
    builder.add_lexicon_file("./my_words.csv");
    
    // 构建系统字典
    // 需要设置连接矩阵文件
    builder.set_matrix_file("./matrix.def");
    const systemResult = builder.build_system_dictionary("./system.dic");
    console.log("系统字典构建结果:", systemResult);
    
    // 构建用户字典
    // 需要设置系统字典路径
    builder.set_system_dict_path("./system.dic");
    const userResult = builder.build_user_dictionary("./user.dic");
    console.log("用户字典构建结果:", userResult);
  } catch (error) {
    console.error("构建字典失败:", error);
  }
}

buildDictionary();
```

## API

### `new SudachiTokenizer([configPath, resourceDir, dictionaryPath])`
创建一个新的分词器。
- `configPath` (可选): 配置文件路径
- `resourceDir` (可选): 资源目录路径
- `dictionaryPath` (可选): 字典文件路径

### `SudachiMode`
分词模式枚举:
- `SudachiMode.A`: 短单位
- `SudachiMode.B`: 中单位
- `SudachiMode.C`: 长单位 (命名实体)

### `SentenceSplitMode`
句子分割模式枚举:
- `SentenceSplitMode.Default`: 默认分割和分析
- `SentenceSplitMode.Only`: 只分割不分析
- `SentenceSplitMode.None`: 不分割只分析

### `tokenizer.tokenize(text, mode, printAll)`
分词并返回形态素对象数组。
- `text`: 输入文本
- `mode`: 分词模式 (0=A, 1=B, 2=C)
- `printAll`: 是否输出所有信息

返回值为形态素对象数组，每个对象包含以下属性:
- `surface`: 表层形式
- `dictionary_form`: 词典形式
- `reading_form`: 读音形式
- `part_of_speech`: 词性数组
- `normalized_form`: 标准化形式
- `dictionary_id`: 字典ID
- `synonym_group_ids`: 同义词组ID数组
- `is_oov`: 是否未登录词

### `tokenizer.tokenize_to_string(text, mode, wakati, printAll)`
分词并返回格式化的字符串。
- `text`: 输入文本
- `mode`: 分词模式 (0=A, 1=B, 2=C)
- `wakati`: 是否输出分词格式
- `printAll`: 是否输出所有信息

### `tokenizer.split_sentences(text)`
分割文本为句子数组。
- `text`: 输入文本

### `DictionaryBuilder`
字典构建器，可用于构建 Sudachi 系统字典或用户字典。

#### `new DictionaryBuilder()`
创建一个新的字典构建器。

#### `builder.set_config_path(path)`
设置配置文件路径。

#### `builder.set_resource_dir(path)`
设置资源目录路径。

#### `builder.set_matrix_file(path)`
设置连接矩阵文件路径（构建系统字典时必需）。

#### `builder.set_system_dict_path(path)`
设置系统字典路径（构建用户字典时必需）。

#### `builder.set_description(description)`
设置字典描述信息。

#### `builder.add_lexicon_file(path)`
添加词汇表文件路径。

#### `builder.build_system_dictionary(outputPath)`
构建系统字典并写入到指定路径。

#### `builder.build_user_dictionary(outputPath)`
构建用户字典并写入到指定路径。

## Building from Source

```bash
npm run build
```

## License

MIT 