const { SudachiTokenizer } = require('./index');

function main() {
  try {
    console.log('===== 初始化 Sudachi 分词器 =====');
    console.log('注意: 首次运行需要正确配置字典文件');
    console.log('可以从 https://github.com/WorksApplications/SudachiDict-core/releases 下载字典');
    console.log('将下载的字典文件放在适当的目录中，并通过 dictionaryPath 参数指定\n');

    // 创建一个使用默认配置的分词器
    // 你可以通过提供可选参数来指定配置文件、资源目录或字典路径
    // new SudachiTokenizer(configPath, resourceDir, dictionaryPath)

    // 示例：使用特定字典
    // const tokenizer = new SudachiTokenizer(null, null, "./system.dic");
    const tokenizer = new SudachiTokenizer(null, null, "/home/yz/kakuyaku/kaku-yaku-api/data/sudachi/system_small.dic");

    // 示例文本
    const text = '日本語の形態素解析器です。';

    console.log('===== 分词结果对象 =====');
    // 使用不同模式进行分词 (A=0, B=1, C=2)
    const tokensA = tokenizer.tokenize(text, 0, false);
    console.log('Mode A (短单位):', JSON.stringify(tokensA, null, 2));

    const tokensB = tokenizer.tokenize(text, 1, false);
    console.log('Mode B (中单位):', JSON.stringify(tokensB, null, 2));

    const tokensC = tokenizer.tokenize(text, 2, true);
    console.log('Mode C (长单位 + 详细信息):', JSON.stringify(tokensC, null, 2));

    console.log('\n===== 文本输出格式 =====');
    // 标准格式输出
    const outputA = tokenizer.tokenizeToString(text, 0, false, false);
    console.log('标准格式 (Mode A):\n' + outputA);

    // 详细格式输出
    const outputB = tokenizer.tokenizeToString(text, 1, false, true);
    console.log('详细格式 (Mode B):\n' + outputB);

    // 分词格式输出
    const wakati = tokenizer.tokenizeToString(text, 2, true, false);
    console.log('分词格式 (Mode C): ' + wakati);

    console.log('\n===== 句子分割 =====');
    const multiSentence = '吾輩は猫である。名前はまだ無い。どこで生まれたか頓と見当がつかぬ。';
    const sentences = tokenizer.splitSentences(multiSentence);
    console.log('分割的句子：', sentences);

  } catch (error) {
    console.error('Error:', error.message || error);
    console.error('\n====== 可能的解决方案 ======');
    console.error('1. 从 https://github.com/WorksApplications/SudachiDict-core/releases 下载字典');
    console.error('2. 解压缩文件并找到 system_core.dic 文件');
    console.error('3. 使用以下代码指定字典路径:');
    console.error('   const tokenizer = new SudachiTokenizer(null, null, "/path/to/system_core.dic");\n');
  }
}

main(); 