const { DictionaryBuilder } = require('./index');

function buildDictionary() {
  try {
    // 创建字典构建器
    let builder = new DictionaryBuilder();
    
    // 设置描述信息
    builder.setDescription("Sudachi custom dictionary example");
    
    // 假设有以下文件:
    // - matrix.def: 连接矩阵定义文件
    // - user_lexicon.csv: 用户词汇表文件
    // - system_lexicon.csv: 系统词汇表文件
    
    // 构建系统字典
    console.log("构建系统字典...");
    try {
      // 设置连接矩阵文件 - 系统字典构建必需
      builder.setMatrixFile("./matrix.def");
      
      // 添加词汇表文件
      builder.addLexiconFile("./system_lexicon.csv");
      
      // 构建字典并保存到文件
      const systemResult = builder.buildSystemDictionary("./system.dic");
      console.log("系统字典构建结果:\n", systemResult);
    } catch (error) {
      console.error("系统字典构建失败:", error);
    }
    
    // 构建用户字典
    console.log("\n构建用户字典...");
    try {
      // 创建新的构建器实例
      builder = new DictionaryBuilder();
      builder.setDescription("Sudachi custom user dictionary example");
      
      // 设置系统字典路径 - 用户字典构建必需
      builder.setSystemDictPath("./system.dic");
      
      // 添加词汇表文件
      builder.addLexiconFile("./user_lexicon.csv");
      
      // 构建字典并保存到文件
      const userResult = builder.buildUserDictionary("./user.dic");
      console.log("用户字典构建结果:\n", userResult);
    } catch (error) {
      console.error("用户字典构建失败:", error);
    }
    
    console.log("\n字典构建完成!");
  } catch (error) {
    console.error("构建字典过程中发生错误:", error);
  }
}

buildDictionary(); 