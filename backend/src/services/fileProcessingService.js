/**
 * 文件处理服务模块
 * 处理文件上传、解析、内容分析和学习材料生成
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const config = require('../config');
const aiService = require('./aiService');
const websocketService = require('./websocketService');

class FileProcessingService {
  constructor() {
    this.uploadDir = config.upload.uploadDir;
    this.allowedTypes = config.upload.allowedTypes;
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
      Logger.info('开始处理文件', { 
        filename: file.originalname, 
        englishLevel, 
        clientId 
      });

      // 验证文件
      this.validateFile(file);

      // 发送初始进度
      websocketService.sendProgress(clientId, '📤 正在上传和解析文件...', 10);

      // 读取文件内容
      const content = fs.readFileSync(file.path, 'utf-8');
      const ext = path.extname(file.originalname).toLowerCase();

      // 发送文件解析进度
      websocketService.sendProgress(clientId, '📄 正在解析文件内容...', 12);

      // 解析文件并进行AI分句
      let sentences = [];
      if (ext === '.srt') {
        websocketService.sendProgress(clientId, '🎬 正在处理字幕文件...', 15);
        sentences = await this.parseSRT(content, clientId);
      } else if (ext === '.txt') {
        websocketService.sendProgress(clientId, '📝 正在处理文本文件...', 15);
        sentences = await this.parseTXT(content, clientId);
      }

      if (sentences.length === 0) {
        throw new Error('文件内容为空或格式不正确');
      }

      Logger.info('文件解析和AI分句完成', { sentenceCount: sentences.length });
      websocketService.sendProgress(clientId, '✅ 智能分句完成，开始智能分段和标题生成...', 20);

      // 智能分段并生成段落标题
      websocketService.sendProgress(clientId, '🎯 正在智能分段和生成标题...', 25);
      const paragraphs = await aiService.generateParagraphsWithTitles(sentences, englishLevel, clientId);
      websocketService.sendProgress(clientId, '✅ 智能分段和标题生成完成', 30);

      // 生成句子解释
      const allSentences = paragraphs.flatMap(p => p.sentences);
      await aiService.generateSentenceExplanations(allSentences, englishLevel, clientId);

      // 生成词汇分析
      websocketService.sendProgress(clientId, '🎯 正在分析重点词汇...', 85);
      const allText = sentences.map(s => s.text).join(' ');
      const vocabularyAnalysis = await aiService.generateVocabularyAnalysis(allText, englishLevel);
      websocketService.sendProgress(clientId, '✨ 重点词汇分析完成...', 95);

      // 计算处理时间
      const processingTime = Date.now() - startTime;
      Logger.success('文件处理完成', { 
        processingTime, 
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        vocabularyCount: vocabularyAnalysis.length 
      });

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

      // 发送完成消息
      websocketService.sendProgress(clientId, '🎉 处理完成，正在返回结果...', 100);
      websocketService.sendCompleted(clientId, result);

      return result;

    } catch (error) {
      Logger.error('文件处理失败', { 
        error: error.message, 
        filename: file?.originalname,
        clientId 
      });

      // 清理临时文件
      if (file && file.path) {
        this.cleanupFile(file.path);
      }

      // 发送错误消息
      websocketService.sendError(clientId, error.message);

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