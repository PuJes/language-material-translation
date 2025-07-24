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

      // 解析文件
      let sentences = [];
      if (ext === '.srt') {
        sentences = this.parseSRT(content);
      } else if (ext === '.txt') {
        sentences = this.parseTXT(content);
      }

      if (sentences.length === 0) {
        throw new Error('文件内容为空或格式不正确');
      }

      Logger.info('文件解析完成', { sentenceCount: sentences.length });
      websocketService.sendProgress(clientId, '✅ 文件解析完成，开始智能分析...', 20);

      // 分组为段落
      const paragraphs = this.groupIntoParagraphs(sentences);
      Logger.info('段落分组完成', { paragraphCount: paragraphs.length });

      // 生成段落标题
      websocketService.sendProgress(clientId, '🎯 正在生成智能标题...', 25);
      await aiService.generateParagraphTitles(paragraphs, englishLevel, clientId);
      websocketService.sendProgress(clientId, '✅ 智能标题生成完成', 30);

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
   * 解析SRT文件
   * @param {string} content - 文件内容
   * @returns {Array} 句子数组
   */
  parseSRT(content) {
    try {
      const lines = content.split('\n');
      const subtitles = [];
      let current = {};

      for (let line of lines) {
        line = line.trim();
        if (!line) {
          if (current.text) {
            subtitles.push(current);
            current = {};
          }
          continue;
        }

        if (/^\d+$/.test(line)) {
          if (current.text) subtitles.push(current);
          current = { id: parseInt(line), text: '' };
        } else if (line.includes('-->')) {
          current.timeRange = line;
        } else {
          current.text = current.text ? current.text + ' ' + line : line;
        }
      }

      if (current.text) subtitles.push(current);

      const sentences = subtitles.map(s => ({ 
        id: s.id, 
        text: s.text.replace(/\s+/g, ' ').trim() 
      }));

      Logger.info('SRT文件解析成功', { subtitleCount: subtitles.length });
      return sentences;

    } catch (error) {
      Logger.error('SRT文件解析失败', { error: error.message });
      throw new Error('SRT文件格式错误');
    }
  }

  /**
   * 解析TXT文件
   * @param {string} content - 文件内容
   * @returns {Array} 句子数组
   */
  parseTXT(content) {
    try {
      // 改进的句子分割算法
      const sentences = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split(/[.!?]+\s*\n|\n\s*\n/)
        .filter(s => s.trim())
        .map((text, index) => ({
          id: index + 1,
          text: text.trim()
        }))
        .filter(s => s.text.length > 10); // 过滤太短的句子

      Logger.info('TXT文件解析成功', { sentenceCount: sentences.length });
      return sentences;

    } catch (error) {
      Logger.error('TXT文件解析失败', { error: error.message });
      throw new Error('TXT文件格式错误');
    }
  }

  /**
   * 分组为段落
   * @param {Array} sentences - 句子数组
   * @returns {Array} 段落数组
   */
  groupIntoParagraphs(sentences) {
    const paragraphs = [];
    const perParagraph = Math.min(4, Math.max(2, Math.ceil(sentences.length / 10)));

    for (let i = 0; i < sentences.length; i += perParagraph) {
      paragraphs.push({
        id: Math.floor(i / perParagraph) + 1,
        sentences: sentences.slice(i, i + perParagraph),
        title: ''
      });
    }

    Logger.info('段落分组完成', { 
      paragraphCount: paragraphs.length, 
      sentencesPerParagraph: perParagraph 
    });
    
    return paragraphs;
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