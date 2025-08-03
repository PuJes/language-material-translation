/**
 * 文件处理服务模块
 * 处理文件上传、解析、内容分析和学习材料生成
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const config = require('../config');
const aiService = require('./aiService');
const { StorageAdapterFactory } = require('../adapters');
const progressService = require('./progressService');

class FileProcessingService {
  constructor() {
    this.uploadDir = config.upload.uploadDir;
    this.allowedTypes = config.upload.allowedTypes;
    this.storageAdapter = StorageAdapterFactory.getInstance();
  }

  /**
   * 处理文件上传和分析
   * @param {object} file - 上传的文件对象
   * @param {string} englishLevel - 英语水平
   * @param {string} clientId - 客户端ID
   * @returns {Promise<object>} 处理结果
   */
  async processFile(file, englishLevel, clientId) {
    const startTime = Date.now();
    
    try {
      // 初始化进度追踪
      progressService.initProgress(clientId, file.originalname, englishLevel);
      progressService.updateProgress(clientId, 5, '开始处理文件...');

      Logger.info('开始处理文件', { 
        filename: file.originalname, 
        englishLevel, 
        clientId 
      });

      // 验证文件
      progressService.updateProgress(clientId, 10, '验证文件格式...');
      this.validateFile(file);
      progressService.addLog(clientId, 'success', `文件验证通过: ${file.originalname}`);

      // 读取文件内容 - 支持存储适配器
      progressService.updateProgress(clientId, 15, '读取文件内容...');
      let content;
      const ext = path.extname(file.originalname).toLowerCase();
      
      try {
        // 优先使用本地文件系统（当前multer保存的文件）
        content = fs.readFileSync(file.path, 'utf-8');
        progressService.addLog(clientId, 'info', `文件读取成功，大小: ${content.length} 字符`);
      } catch (error) {
        progressService.addLog(clientId, 'warn', '直接读取文件失败，尝试使用存储适配器');
        Logger.warn('直接读取文件失败，尝试使用存储适配器', { error: error.message });
        // 如果直接读取失败，可以在这里集成云存储读取逻辑
        throw error;
      }

      // 解析文件并进行AI分句
      progressService.updateProgress(clientId, 25, '解析文件内容...');
      let sentences = [];
      if (ext === '.srt') {
        progressService.addLog(clientId, 'info', '检测到SRT字幕文件，开始解析...');
        sentences = await this.parseSRT(content, clientId);
      } else if (ext === '.txt') {
        progressService.addLog(clientId, 'info', '检测到TXT文本文件，开始解析...');
        sentences = await this.parseTXT(content, clientId);
      }

      if (sentences.length === 0) {
        throw new Error('文件内容为空或格式不正确');
      }

      progressService.updateProgress(clientId, 40, `AI分句完成，共${sentences.length}个句子`);
      progressService.addLog(clientId, 'success', `文件解析完成，提取到 ${sentences.length} 个句子`);

      // 智能分段并生成段落标题
      progressService.updateProgress(clientId, 50, '智能分段和生成标题...');
      progressService.addLog(clientId, 'info', '开始AI智能分段和标题生成...');
      const paragraphs = await aiService.generateParagraphsWithTitles(sentences, englishLevel, clientId);
      progressService.updateProgress(clientId, 65, `智能分段完成，共${paragraphs.length}个段落`);
      progressService.addLog(clientId, 'success', `智能分段完成，生成 ${paragraphs.length} 个段落`);

      // 生成句子解释
      progressService.updateProgress(clientId, 75, '生成句子解释...');
      const allSentences = paragraphs.flatMap(p => p.sentences);
      progressService.addLog(clientId, 'info', `开始为 ${allSentences.length} 个句子生成解释...`);
      await aiService.generateSentenceExplanations(allSentences, englishLevel, clientId);
      progressService.addLog(clientId, 'success', '句子解释生成完成');

      // 生成词汇分析
      progressService.updateProgress(clientId, 85, '分析重点词汇...');
      progressService.addLog(clientId, 'info', '开始分析重点词汇和短语...');
      const allText = sentences.map(s => s.text).join(' ');
      const vocabularyAnalysis = await aiService.generateVocabularyAnalysis(allText, englishLevel, clientId);
      progressService.updateProgress(clientId, 95, `词汇分析完成，识别${vocabularyAnalysis.length}个重点词汇`);
      progressService.addLog(clientId, 'success', `词汇分析完成，识别 ${vocabularyAnalysis.length} 个重点词汇`);

      // 计算处理时间
      const processingTime = Date.now() - startTime;
      
      // 清理临时文件
      this.cleanupFile(file.path);

      // 构建结果
      const result = {
        paragraphs,
        vocabularyAnalysis,
        englishLevel,
        totalSentences: sentences.length,
        totalParagraphs: paragraphs.length,
        processingTime: processingTime
      };

      // 标记处理完成
      progressService.completeProgress(clientId, result);
      
      Logger.success('文件处理完成', { 
        processingTime, 
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        vocabularyCount: vocabularyAnalysis.length 
      });

      return result;

    } catch (error) {
      // 标记处理错误
      progressService.errorProgress(clientId, error);
      
      Logger.error('文件处理失败', { 
        error: error.message, 
        filename: file?.originalname,
        clientId 
      });

      // 清理临时文件
      if (file && file.path) {
        this.cleanupFile(file.path);
      }

      throw error;
    }
  }

  /**
   * 验证文件
   * @param {object} file - 文件对象
   */
  validateFile(file) {
    if (!file) {
      throw new Error('请上传文件');
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!this.allowedTypes.includes(fileExtension)) {
      throw new Error('只支持 .txt 和 .srt 格式的文件');
    }

    if (file.size > config.upload.maxFileSize) {
      throw new Error('文件大小不能超过 5MB');
    }
  }

  /**
   * 解析SRT文件（集成AI智能分句）
   * @param {string} content - 文件内容
   * @param {string} clientId - 客户端ID（用于进度反馈）
   * @returns {Promise<Array>} 句子数组
   */
  async parseSRT(content, clientId = null) {
    try {
      Logger.info('开始解析SRT文件', { contentLength: content.length, clientId });

      // 第一步：提取所有字幕文本内容（忽略时间戳）
      const lines = content.split('\n');
      const textLines = [];
      let current = {};

      for (let line of lines) {
        line = line.trim();
        if (!line) {
          if (current.text) {
            textLines.push(current.text);
            current = {};
          }
          continue;
        }

        if (/^\d+$/.test(line)) {
          // 字幕序号行
          if (current.text) {
            textLines.push(current.text);
          }
          current = { text: '' };
        } else if (line.includes('-->')) {
          // 时间戳行，忽略（不保留时间戳信息）
          continue;
        } else {
          // 字幕文本行
          current.text = current.text ? current.text + ' ' + line : line;
        }
      }

      // 添加最后一个字幕文本
      if (current.text) {
        textLines.push(current.text);
      }

      // 第二步：合并所有文本为一个完整文本
      const fullText = textLines
        .map(text => text.replace(/\s+/g, ' ').trim()) // 规范化空格
        .filter(text => text.length > 0) // 过滤空文本
        .join(' '); // 用空格连接

      if (!fullText) {
        throw new Error('SRT文件中没有有效的文本内容');
      }

      Logger.info('SRT文件文本提取完成', { 
        originalSubtitles: textLines.length,
        fullTextLength: fullText.length 
      });

      // 第三步：使用AI进行智能分句
      Logger.info('开始AI分句处理', { textLength: fullText.length });
      const sentences = await aiService.splitSentences(fullText, clientId);

      Logger.success('SRT文件解析和分句完成', { 
        originalSubtitles: textLines.length,
        finalSentences: sentences.length 
      });

      return sentences;

    } catch (error) {
      Logger.error('SRT文件解析失败', { error: error.message });
      
      // 根据错误类型提供更具体的错误信息
      if (error.message.includes('分句处理失败')) {
        throw new Error('AI分句处理失败，请稍后重试');
      } else if (error.message.includes('文本过长')) {
        throw new Error('SRT文件内容过长，无法处理');
      } else {
        throw new Error('SRT文件格式错误或处理失败');
      }
    }
  }

  /**
   * 解析TXT文件（集成AI智能分句）
   * @param {string} content - 文件内容
   * @param {string} clientId - 客户端ID（用于进度反馈）
   * @returns {Promise<Array>} 句子数组
   */
  async parseTXT(content, clientId = null) {
    try {
      Logger.info('开始解析TXT文件', { contentLength: content.length, clientId });

      // 第一步：清理和规范化文本
      const cleanedText = content
        .replace(/\r\n/g, '\n') // 统一换行符
        .replace(/\r/g, '\n')   // 统一换行符
        .replace(/\s+/g, ' ')   // 规范化空格
        .trim();                // 去除首尾空格

      if (!cleanedText) {
        throw new Error('TXT文件中没有有效的文本内容');
      }

      Logger.info('TXT文件文本清理完成', { 
        originalLength: content.length,
        cleanedLength: cleanedText.length 
      });

      // 第二步：使用AI进行智能分句
      Logger.info('开始AI分句处理', { textLength: cleanedText.length });
      const sentences = await aiService.splitSentences(cleanedText, clientId);

      Logger.success('TXT文件解析和分句完成', { 
        originalLength: content.length,
        finalSentences: sentences.length 
      });

      return sentences;

    } catch (error) {
      Logger.error('TXT文件解析失败', { error: error.message });
      
      // 根据错误类型提供更具体的错误信息
      if (error.message.includes('分句处理失败')) {
        throw new Error('AI分句处理失败，请稍后重试');
      } else if (error.message.includes('文本过长')) {
        throw new Error('TXT文件内容过长，无法处理');
      } else {
        throw new Error('TXT文件格式错误或处理失败');
      }
    }
  }



  /**
   * 清理临时文件
   * @param {string} filePath - 文件路径
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        Logger.debug('临时文件已删除', { filePath });
      }
    } catch (error) {
      Logger.warn('删除临时文件失败', { filePath, error: error.message });
    }
  }

  /**
   * 验证英语水平
   * @param {string} englishLevel - 英语水平
   * @returns {boolean} 是否有效
   */
  validateEnglishLevel(englishLevel) {
    const validLevels = Object.keys(config.englishLevels);
    return validLevels.includes(englishLevel);
  }

  /**
   * 获取英语水平信息
   * @param {string} englishLevel - 英语水平
   * @returns {object} 水平信息
   */
  getEnglishLevelInfo(englishLevel) {
    return config.englishLevels[englishLevel] || config.englishLevels['CET-4'];
  }

  /**
   * 获取支持的文件类型
   * @returns {Array} 文件类型数组
   */
  getSupportedFileTypes() {
    return this.allowedTypes;
  }

  /**
   * 获取文件大小限制
   * @returns {number} 文件大小限制（字节）
   */
  getFileSizeLimit() {
    return config.upload.maxFileSize;
  }
}

// 创建单例实例
const fileProcessingService = new FileProcessingService();

module.exports = fileProcessingService; 