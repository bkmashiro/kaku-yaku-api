use napi_derive::napi;
use napi::{Error, Result, Status};
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

#[napi]
pub struct MorphemeObject {
  pub surface: String,
  pub dictionary_form: String,
  pub reading_form: String,
  pub part_of_speech: Vec<String>,
  pub normalized_form: String,
  pub dictionary_id: i32,
  pub synonym_group_ids: Vec<u32>,
  pub is_oov: bool,
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
  ) -> Result<Vec<MorphemeObject>> {
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
    
    let result = morphemes.iter()
      .map(|m| MorphemeObject {
        surface: m.surface().to_string(),
        dictionary_form: m.dictionary_form().to_string(),
        reading_form: m.reading_form().to_string(),
        part_of_speech: m.part_of_speech().iter().map(|p| p.to_string()).collect(),
        normalized_form: m.normalized_form().to_string(),
        dictionary_id: m.dictionary_id(),
        synonym_group_ids: m.synonym_group_ids().to_vec(),
        is_oov: m.is_oov(),
      })
      .collect();
    
    Ok(result)
  }

  #[napi]
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

  #[napi]
  pub fn split_sentences(&self, text: String) -> Result<Vec<String>> {
    let dict_guard = self.dict.lock()
      .map_err(|e| Error::new(Status::GenericFailure, format!("Failed to lock dictionary: {}", e)))?;
    
    let splitter = SentenceSplitter::new().with_checker(dict_guard.lexicon());
    
    let sentences = splitter.split(&text)
      .map(|(_, s)| s.to_string())
      .collect::<Vec<String>>();
    
    Ok(sentences)
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

  #[napi]
  pub fn set_config_path(&mut self, path: String) {
    self.config_path = Some(PathBuf::from(path));
  }

  #[napi]
  pub fn set_resource_dir(&mut self, path: String) {
    self.resource_dir = Some(PathBuf::from(path));
  }

  #[napi]
  pub fn set_matrix_file(&mut self, path: String) {
    self.matrix_file = Some(PathBuf::from(path));
  }

  #[napi]
  pub fn set_system_dict_path(&mut self, path: String) {
    self.system_dict_path = Some(PathBuf::from(path));
  }

  #[napi]
  pub fn set_description(&mut self, description: String) {
    self.description = description;
  }

  #[napi]
  pub fn add_lexicon_file(&mut self, path: String) {
    self.lexicon_files.push(PathBuf::from(path));
  }

  #[napi]
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

  #[napi]
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
