use napi_derive::napi;
use napi::{Error, Result, Status, Env};
use napi::bindgen_prelude::*;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex;
use std::io::{BufWriter, Write};
use sudachi::prelude::*;
use sudachi::config::Config;
use sudachi::dic::dictionary::JapaneseDictionary;
use sudachi::dic::build::DictBuilder;
use sudachi::analysis::stateless_tokenizer::StatelessTokenizer;
use sudachi::sentence_splitter::SentenceSplitter;
use sudachi::analysis::Tokenize;
use sudachi::sentence_splitter::SplitSentences;

#[napi]
#[derive(Debug)]
pub enum SudachiMode {
  A = 0,
  B = 1, 
  C = 2,
}

impl From<SudachiMode> for Mode {
  fn from(mode: SudachiMode) -> Self {
    match mode {
      SudachiMode::A => Mode::A,
      SudachiMode::B => Mode::B,
      SudachiMode::C => Mode::C,
    }
  }
}

#[napi]
#[derive(Debug)]
pub enum SentenceSplitMode {
  Default = 0,
  Only = 1,
  None = 2,
}

#[napi(object)]
#[derive(Default)]
pub struct MorphemeObject {
  pub surface: String,
  pub dictionaryForm: String,
  pub readingForm: String,
  pub partOfSpeech: Vec<String>,
  pub normalizedForm: String,
  pub dictionaryId: i32,
  pub synonymGroupIds: Vec<u32>,
  pub isOov: bool,
}

#[napi]
pub struct SudachiTokenizer {
  dict: Arc<Mutex<JapaneseDictionary>>,
}

#[napi]
impl SudachiTokenizer {
  #[napi(constructor)]
  pub fn new(
    #[napi(ts_arg_type = "string | undefined")] config_path: Option<String>,
    #[napi(ts_arg_type = "string | undefined")] resource_dir: Option<String>,
    #[napi(ts_arg_type = "string | undefined")] dictionary_path: Option<String>,
  ) -> Result<Self> {
    let config_path = config_path.map(PathBuf::from);
    let resource_dir = resource_dir.map(PathBuf::from);
    let dictionary_path = dictionary_path.map(PathBuf::from);

    let config = Config::new(config_path, resource_dir, dictionary_path)
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to load config: {}", e)))?;

    let dict = JapaneseDictionary::from_cfg(&config)
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to create dictionary: {}", e)))?;

    Ok(Self {
      dict: Arc::new(Mutex::new(dict)),
    })
  }

  #[napi]
  pub fn tokenize(
    &self,
    text: String,
    #[napi(ts_arg_type = "SudachiMode")] mode: u32,
    #[napi(ts_arg_type = "boolean")] _print_all: bool,
    env: Env,
  ) -> Result<Array> {
    let mode = match mode {
      0 => Mode::A,
      1 => Mode::B,
      2 => Mode::C,
      _ => return Err(Error::new(Status::InvalidArg, "Invalid mode")),
    };

    let dict_guard = self.dict.lock()
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to lock dictionary: {}", e)))?;
    
    let tokenizer = StatelessTokenizer::new(&*dict_guard);
    
    let morphemes = tokenizer.tokenize(&text, mode, false)
      .map_err(|e| Error::new(Status::GenericFailure, format!("Tokenization failed: {}", e)))?;
    
    let mut array = env.create_array(morphemes.len() as u32)?;
    
    for (i, m) in morphemes.iter().enumerate() {
      let mut obj = env.create_object()?;
      
      let surface = env.create_string(&m.surface())?;
      obj.set_named_property("surface", surface)?;
      
      let dict_form = env.create_string(m.dictionary_form())?;
      obj.set_named_property("dictionaryForm", dict_form)?;
      
      let reading = env.create_string(m.reading_form())?;
      obj.set_named_property("readingForm", reading)?;
      
      let mut part_of_speech_arr = env.create_array(m.part_of_speech().len() as u32)?;
      for (j, pos) in m.part_of_speech().iter().enumerate() {
        let pos_str = env.create_string(pos)?;
        part_of_speech_arr.set(j as u32, pos_str)?;
      }
      obj.set_named_property("partOfSpeech", part_of_speech_arr)?;
      
      let normalized = env.create_string(m.normalized_form())?;
      obj.set_named_property("normalizedForm", normalized)?;
      
      let dict_id = env.create_int32(m.dictionary_id())?;
      obj.set_named_property("dictionaryId", dict_id)?;
      
      let mut synonym_ids_arr = env.create_array(m.synonym_group_ids().len() as u32)?;
      for (j, id) in m.synonym_group_ids().iter().enumerate() {
        let id_val = env.create_uint32(*id)?;
        synonym_ids_arr.set(j as u32, id_val)?;
      }
      obj.set_named_property("synonymGroupIds", synonym_ids_arr)?;
      
      let is_oov = env.get_boolean(m.is_oov())?;
      obj.set_named_property("isOov", is_oov)?;
      
      array.set(i as u32, obj)?;
    }
    
    Ok(array)
  }

  #[napi(js_name = "tokenizeToString")]
  pub fn tokenize_to_string(
    &self,
    text: String,
    #[napi(ts_arg_type = "SudachiMode")] mode: u32,
    #[napi(ts_arg_type = "boolean")] wakati: bool,
    #[napi(ts_arg_type = "boolean")] print_all: bool,
  ) -> Result<String> {
    let mode = match mode {
      0 => Mode::A,
      1 => Mode::B,
      2 => Mode::C,
      _ => return Err(Error::new(Status::InvalidArg, "Invalid mode")),
    };

    let dict_guard = self.dict.lock()
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to lock dictionary: {}", e)))?;
    
    let tokenizer = StatelessTokenizer::new(&*dict_guard);
    
    let morphemes = tokenizer.tokenize(&text, mode, false)
      .map_err(|e| Error::new(Status::GenericFailure, format!("Tokenization failed: {}", e)))?;
    
    let mut result = String::new();
    
    if wakati {
      // Wakati output format (space-separated)
      for (i, m) in morphemes.iter().enumerate() {
        if i > 0 {
          result.push(' ');
        }
        result.push_str(&m.surface());
      }
    } else {
      // Default output format
      for m in morphemes.iter() {
        result.push_str(&m.surface());
        result.push('\t');
        
        let pos = m.part_of_speech();
        for (i, p) in pos.iter().enumerate() {
          result.push_str(p);
          if i + 1 != pos.len() {
            result.push(',');
          }
        }
        
        result.push('\t');
        result.push_str(m.normalized_form());
        
        if print_all {
          result.push('\t');
          result.push_str(m.dictionary_form());
          result.push('\t');
          result.push_str(m.reading_form());
          result.push('\t');
          result.push_str(&m.dictionary_id().to_string());
          result.push('\t');
          
          let synonym_groups = m.synonym_group_ids();
          result.push_str(&format!("{:?}", synonym_groups));
          
          if m.is_oov() {
            result.push_str("\t(OOV)");
          }
        }
        
        result.push('\n');
      }
      result.push_str("EOS\n");
    }
    
    Ok(result)
  }

  #[napi(js_name = "splitSentences")]
  pub fn split_sentences(&self, text: String, env: Env) -> Result<Array> {
    let dict_guard = self.dict.lock()
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to lock dictionary: {}", e)))?;
    
    // 创建句子分割器
    let splitter = SentenceSplitter::new().with_checker(dict_guard.lexicon());
    
    // 直接用一个 Vec 收集所有结果
    let sentences: Vec<&str> = splitter.split(&text)
      .map(|(_, sent)| sent)
      .collect();
    
    // 如果分割结果为空但文本不为空，返回原文
    let final_sentences = if sentences.is_empty() && !text.is_empty() {
      vec![text.as_str()]
    } else {
      sentences
    };
    
    // 创建 JavaScript 数组
    let mut array = env.create_array(final_sentences.len() as u32)?;
    for (i, &sentence) in final_sentences.iter().enumerate() {
      let js_sentence = env.create_string(sentence)?;
      array.set(i as u32, js_sentence)?;
    }
    
    Ok(array)
  }
}

#[napi]
pub struct DictionaryBuilder {
  config_path: Option<PathBuf>,
  resource_dir: Option<PathBuf>,
  lexicon_files: Vec<PathBuf>,
  matrix_file: Option<PathBuf>,
  system_dict_path: Option<PathBuf>,
  description: String,
}

#[napi]
impl DictionaryBuilder {
  #[napi(constructor)]
  pub fn new() -> Self {
    DictionaryBuilder {
      config_path: None,
      resource_dir: None,
      lexicon_files: Vec::new(),
      matrix_file: None,
      system_dict_path: None,
      description: String::new(),
    }
  }

  #[napi(js_name = "setConfigPath")]
  pub fn set_config_path(&mut self, path: String) {
    self.config_path = Some(PathBuf::from(path));
  }

  #[napi(js_name = "setResourceDir")]
  pub fn set_resource_dir(&mut self, path: String) {
    self.resource_dir = Some(PathBuf::from(path));
  }

  #[napi(js_name = "setMatrixFile")]
  pub fn set_matrix_file(&mut self, path: String) {
    self.matrix_file = Some(PathBuf::from(path));
  }

  #[napi(js_name = "setSystemDictPath")]
  pub fn set_system_dict_path(&mut self, path: String) {
    self.system_dict_path = Some(PathBuf::from(path));
  }

  #[napi(js_name = "setDescription")]
  pub fn set_description(&mut self, description: String) {
    self.description = description;
  }

  #[napi(js_name = "addLexiconFile")]
  pub fn add_lexicon_file(&mut self, path: String) {
    self.lexicon_files.push(PathBuf::from(path));
  }

  #[napi(js_name = "buildSystemDictionary")]
  pub fn build_system_dictionary(&self, output_path: String) -> Result<String> {
    let matrix_path = match &self.matrix_file {
      Some(path) => path,
      None => return Err(Error::new(Status::InvalidArg, "Matrix file is required for system dictionary")),
    };

    let mut builder = DictBuilder::new_system();
    builder.set_description(self.description.clone());

    builder.read_conn(matrix_path.as_path())
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to read connection matrix: {}", e)))?;

    for path in &self.lexicon_files {
      builder.read_lexicon(path.as_path())
        .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to read lexicon file: {}", e)))?;
    }

    builder.resolve()
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to resolve references: {}", e)))?;

    let output = PathBuf::from(output_path);
    let file = match std::fs::OpenOptions::new()
      .write(true)
      .create(true)
      .truncate(true)
      .open(&output) {
        Ok(f) => f,
        Err(e) => return Err(Error::new(Status::GenericFailure, format!("Failed to create output file: {}", e))),
      };

    let mut buf_writer = BufWriter::with_capacity(16 * 1024, file);

    builder.compile(&mut buf_writer)
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to compile dictionary: {}", e)))?;

    buf_writer.flush()
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to flush buffer: {}", e)))?;

    let report = builder.report();
    let mut result = String::new();
    
    for part in report {
      let unit = if part.is_write() { "bytes" } else { "entries" };
      result.push_str(&format!("{} {} {} in {:.3} sec\n", 
        part.part(), part.size(), unit, part.time().as_secs_f32()));
    }

    Ok(result)
  }

  #[napi(js_name = "buildUserDictionary")]
  pub fn build_user_dictionary(&self, output_path: String) -> Result<String> {
    let system_dict_path = match &self.system_dict_path {
      Some(path) => path,
      None => return Err(Error::new(Status::InvalidArg, "System dictionary path is required for user dictionary")),
    };

    let config = Config::new(self.config_path.clone(), self.resource_dir.clone(), Some(system_dict_path.clone()))
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to create config: {}", e)))?;

    let dict = JapaneseDictionary::from_cfg(&config)
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to load system dictionary: {}", e)))?;

    let mut builder = DictBuilder::new_user(&dict);
    builder.set_description(self.description.clone());

    for path in &self.lexicon_files {
      builder.read_lexicon(path.as_path())
        .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to read lexicon file: {}", e)))?;
    }

    builder.resolve()
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to resolve references: {}", e)))?;

    let output = PathBuf::from(output_path);
    let file = match std::fs::OpenOptions::new()
      .write(true)
      .create(true)
      .truncate(true)
      .open(&output) {
        Ok(f) => f,
        Err(e) => return Err(Error::new(Status::GenericFailure, format!("Failed to create output file: {}", e))),
      };

    let mut buf_writer = BufWriter::with_capacity(16 * 1024, file);

    builder.compile(&mut buf_writer)
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to compile dictionary: {}", e)))?;

    buf_writer.flush()
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to flush buffer: {}", e)))?;

    let report = builder.report();
    let mut result = String::new();
    
    for part in report {
      let unit = if part.is_write() { "bytes" } else { "entries" };
      result.push_str(&format!("{} {} {} in {:.3} sec\n", 
        part.part(), part.size(), unit, part.time().as_secs_f32()));
    }

    Ok(result)
  }
}

