/**
 * AI服务模块
 * 处理AI API调用、智能内容生成和降级处理
 */

const axios = require('axios');
const Logger = require('../utils/logger');
const config = require('../config');
const networkDiagnostic = require('../utils/networkDiagnostic');

class AIService {
  constructor() {
    this.apiUrl = config.ai.apiUrl;
    this.apiKey = config.ai.apiKey;
    this.model = config.ai.model;
    this.maxTokens = config.ai.maxTokens;
    this.temperature = config.ai.temperature;
    this.timeout = config.ai.timeout;
    this.retries = config.ai.retries;
    
    // 新增：动态超时配置
    this.dynamicTimeout = config.ai.dynamicTimeout;
    this.smartRetry = config.ai.smartRetry;
    
    // 创建优化的HTTPS代理，提高连接稳定性
    this.httpsAgent = new (require('https').Agent)({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 10, // 增加最大连接数
      maxFreeSockets: 10, // 增加空闲连接数
      timeout: this.timeout,
      freeSocketTimeout: 30000,
      // 添加重试机制
      retryDelay: 1000,
      maxRetries: 3
    });
  }

  /**
   * 计算动态超时时间
   * @param {string} text - 输入文本
   * @returns {number} 计算出的超时时间（毫秒）
   */
  calculateDynamicTimeout(text) {
    if (!this.dynamicTimeout.enabled) {
      return this.timeout; // 返回默认超时时间
    }

    const { baseTimeout, perCharacterTimeout, maxTimeout, minTimeout } = this.dynamicTimeout;
    
    // 根据文本长度计算超时时间
    const textLength = text.length;
    const calculatedTimeout = baseTimeout + (textLength * perCharacterTimeout);
    
    // 确保超时时间在合理范围内
    const finalTimeout = Math.max(minTimeout, Math.min(maxTimeout, calculatedTimeout));
    
    Logger.debug('动态超时计算', {
      textLength: textLength,
      baseTimeout: baseTimeout,
      calculatedTimeout: calculatedTimeout,
      finalTimeout: finalTimeout
    });
    
    return finalTimeout;
  }

  /**
   * 计算智能重试延迟
   * @param {number} attempt - 当前重试次数
   * @returns {number} 延迟时间（毫秒）
   */
  calculateRetryDelay(attempt) {
    if (!this.smartRetry.enabled) {
      return Math.min(1000 * Math.pow(2, attempt), 10000); // 默认指数退避
    }

    const { exponentialBackoff, maxBackoffDelay, jitter } = this.smartRetry;
    
    let delay;
    if (exponentialBackoff) {
      // 指数退避：基础延迟 * 2^重试次数
      delay = Math.min(1000 * Math.pow(2, attempt), maxBackoffDelay);
    } else {
      // 线性退避：基础延迟 * 重试次数
      delay = Math.min(1000 * (attempt + 1), maxBackoffDelay);
    }
    
    // 添加随机抖动，避免多个请求同时重试
    if (jitter) {
      const jitterAmount = delay * 0.1; // 10%的抖动
      delay += Math.random() * jitterAmount;
    }
    
    return delay;
  }

  /**
   * 调用DeepSeek API
   * @param {string} prompt - 提示词
   * @param {string} text - 输入文本
   * @param {number} retries - 重试次数
   * @returns {Promise<string>} API响应内容
   */
  async callDeepSeekAPI(prompt, text, retries = null) {
    const maxRetries = retries || this.retries;
    const startTime = Date.now();
    
    // 计算动态超时时间
    const dynamicTimeout = this.calculateDynamicTimeout(text);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        Logger.api('DeepSeek API调用', { 
          attempt: i + 1, 
          textLength: text.length,
          promptLength: prompt.length,
          totalAttempts: maxRetries,
          timeout: dynamicTimeout,
          estimatedTime: `${(dynamicTimeout / 1000).toFixed(1)}秒`
        });

        const response = await axios.post(this.apiUrl, {
          model: this.model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: text }
          ],
          stream: false,
          max_tokens: this.maxTokens,
          temperature: this.temperature
        }, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'LanguageLearningAssistant/2.0.0'
          },
          timeout: dynamicTimeout, // 使用动态计算的超时时间
          httpsAgent: this.httpsAgent, // 使用优化的HTTPS代理
          // 添加请求重试配置
          validateStatus: (status) => status < 500, // 只对5xx错误重试
          maxRedirects: 3
        });

        const result = response.data.choices[0].message.content;
        const responseTime = Date.now() - startTime;
        
        Logger.api('DeepSeek API调用成功', { 
          responseLength: result.length,
          attempt: i + 1,
          responseTime: responseTime,
          timeoutUsed: dynamicTimeout,
          statusCode: response.status,
          headers: {
            server: response.headers.server,
            contentType: response.headers['content-type'],
            xRateLimitRemaining: response.headers['x-ratelimit-remaining']
          }
        });
        
        // 记录完整的API响应用于调试
        Logger.debug('完整的API响应', { 
          response: result,
          responseLength: result.length,
          responseTime: responseTime
        });
        
        return result;

      } catch (error) {
        const errorTime = Date.now() - startTime;
        const errorType = this.classifyError(error); // 新增：错误分类
        const errorDetails = {
          error: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseTime: errorTime,
          attempt: i + 1,
          totalAttempts: maxRetries,
          timeoutUsed: dynamicTimeout,
          errorType: errorType, // 新增：错误类型
          url: this.apiUrl,
          model: this.model,
          promptLength: prompt.length,
          textLength: text.length
        };

        // 添加更详细的错误信息
        if (error.response) {
          errorDetails.responseData = error.response.data;
          errorDetails.responseHeaders = error.response.headers;
        } else if (error.request) {
          errorDetails.requestInfo = {
            method: error.request.method,
            url: error.request.url,
            headers: error.request.headers
          };
        }

        // 根据错误类型添加具体建议和恢复策略
        const recoveryStrategy = this.getRecoveryStrategy(errorType, i, maxRetries);
        errorDetails.suggestion = recoveryStrategy.suggestion;
        errorDetails.recoveryAction = recoveryStrategy.action;
        errorDetails.shouldRetry = recoveryStrategy.shouldRetry;

        Logger.error(`DeepSeek API调用失败 (第${i + 1}次)`, errorDetails);

        // 使用网络诊断工具分析错误
        const diagnosis = networkDiagnostic.logErrorDiagnosis(error, {
          promptLength: prompt.length,
          textLength: text.length,
          attempt: i + 1,
          totalAttempts: maxRetries,
          batchSize: text.length > 0 ? 1 : 0,
          errorType: errorType
        });

        // 检查是否应该继续重试
        if (!recoveryStrategy.shouldRetry || i === maxRetries - 1) {
          // 最后一次重试失败或不应该重试，抛出详细错误信息
          const finalError = new Error(`AI_API_FAILED: ${errorType} - ${error.code || error.message}`);
          finalError.details = errorDetails;
          finalError.diagnosis = diagnosis;
          finalError.originalError = error;
          finalError.errorType = errorType;
          throw finalError;
        }

        // 计算智能重试延迟
        const delay = this.calculateRetryDelay(i);
        Logger.info(`等待 ${delay}ms 后重试`, { 
          attempt: i + 1, 
          nextAttempt: i + 2,
          delay: delay,
          errorType: errorType,
          reason: recoveryStrategy.reason
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 错误分类
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   */
  classifyError(error) {
    if (error.code === 'ECONNRESET') return 'CONNECTION_RESET';
    if (error.code === 'ENOTFOUND') return 'DNS_ERROR';
    if (error.code === 'ETIMEDOUT') return 'TIMEOUT';
    if (error.code === 'ECONNREFUSED') return 'CONNECTION_REFUSED';
    if (error.code === 'ENETUNREACH') return 'NETWORK_UNREACHABLE';
    if (error.code === 'ECONNABORTED') return 'CONNECTION_ABORTED';
    
    if (error.response) {
      const status = error.response.status;
      if (status === 429) return 'RATE_LIMIT';
      if (status === 401) return 'AUTHENTICATION_ERROR';
      if (status === 403) return 'AUTHORIZATION_ERROR';
      if (status === 404) return 'NOT_FOUND';
      if (status >= 500) return 'SERVER_ERROR';
      if (status >= 400) return 'CLIENT_ERROR';
    }
    
    if (error.message.includes('timeout')) return 'TIMEOUT';
    if (error.message.includes('network')) return 'NETWORK_ERROR';
    if (error.message.includes('connection')) return 'CONNECTION_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * 获取恢复策略
   * @param {string} errorType - 错误类型
   * @param {number} attempt - 当前重试次数
   * @param {number} maxRetries - 最大重试次数
   * @returns {object} 恢复策略
   */
  getRecoveryStrategy(errorType, attempt, maxRetries) {
    const strategies = {
      'CONNECTION_RESET': {
        suggestion: '网络连接被重置，可能是网络不稳定或服务器负载过高',
        action: '建议稍后重试或检查网络连接',
        shouldRetry: true,
        reason: '网络连接问题，通常可以通过重试解决'
      },
      'DNS_ERROR': {
        suggestion: '域名解析失败，可能是DNS问题或网络连接中断',
        action: '建议检查网络连接或更换DNS服务器',
        shouldRetry: true,
        reason: 'DNS解析问题，重试可能有效'
      },
      'TIMEOUT': {
        suggestion: '请求超时，可能是网络延迟过高或服务器响应慢',
        action: '建议增加超时时间或稍后重试',
        shouldRetry: true,
        reason: '超时问题，重试可能成功'
      },
      'CONNECTION_REFUSED': {
        suggestion: '连接被拒绝，可能是服务器不可用',
        action: '建议稍后重试或联系服务提供商',
        shouldRetry: true,
        reason: '服务器暂时不可用，重试可能有效'
      },
      'NETWORK_UNREACHABLE': {
        suggestion: '网络不可达，可能是网络配置问题',
        action: '建议检查网络配置或联系网络管理员',
        shouldRetry: false,
        reason: '网络配置问题，重试无效'
      },
      'CONNECTION_ABORTED': {
        suggestion: '连接被中止，可能是客户端或服务器主动断开',
        action: '建议检查网络稳定性或稍后重试',
        shouldRetry: true,
        reason: '连接中断，重试可能成功'
      },
      'RATE_LIMIT': {
        suggestion: 'API调用频率超限',
        action: '建议降低调用频率或等待一段时间后重试',
        shouldRetry: attempt < 2, // 只重试前两次
        reason: '频率限制，需要等待'
      },
      'AUTHENTICATION_ERROR': {
        suggestion: 'API密钥无效或已过期',
        action: '建议检查API密钥配置',
        shouldRetry: false,
        reason: '认证问题，重试无效'
      },
      'AUTHORIZATION_ERROR': {
        suggestion: 'API权限不足',
        action: '建议检查API权限设置',
        shouldRetry: false,
        reason: '权限问题，重试无效'
      },
      'SERVER_ERROR': {
        suggestion: '服务器内部错误',
        action: '建议稍后重试或联系服务提供商',
        shouldRetry: true,
        reason: '服务器错误，重试可能成功'
      },
      'CLIENT_ERROR': {
        suggestion: '客户端请求错误',
        action: '建议检查请求参数或联系技术支持',
        shouldRetry: false,
        reason: '请求错误，重试无效'
      },
      'NETWORK_ERROR': {
        suggestion: '网络连接错误',
        action: '建议检查网络连接或稍后重试',
        shouldRetry: true,
        reason: '网络问题，重试可能成功'
      },
      'CONNECTION_ERROR': {
        suggestion: '连接建立失败',
        action: '建议检查网络连接或稍后重试',
        shouldRetry: true,
        reason: '连接问题，重试可能成功'
      },
      'UNKNOWN_ERROR': {
        suggestion: '未知错误，需要进一步诊断',
        action: '建议查看详细日志或联系技术支持',
        shouldRetry: attempt < 1, // 只重试一次
        reason: '未知错误，谨慎重试'
      }
    };
    
    return strategies[errorType] || strategies['UNKNOWN_ERROR'];
  }

  /**
   * 使用DeepSeek AI进行智能分句
   * @param {string} text - 需要分句的完整文本
   * @param {string} clientId - 客户端ID（用于进度反馈）
   * @param {number} splitCount - 当前分割次数（递归参数）
   * @returns {Promise<Array>} 分句结果数组
   */
  async splitSentences(text, clientId = null, splitCount = 0) {
    // 检查文本长度，避免无限递归
    if (text.trim().length === 0) {
      throw new Error('输入文本为空');
    }

    // 最大分割次数限制（避免无限递归）
    const maxSplitCount = 5;
    if (splitCount > maxSplitCount) {
      throw new Error('文本过长，无法进行分句处理');
    }

    // 检查文本长度，如果超过限制则使用大文件处理
    const largeFileThreshold = 15000; // 15KB作为大文件阈值
    if (text.length > largeFileThreshold && splitCount === 0) {
      Logger.info('检测到大文件，使用大文件处理策略', { 
        textLength: text.length, 
        threshold: largeFileThreshold 
      });
      
      try {
        return await this.processLargeFile(text, 'split', null, clientId);
      } catch (error) {
        Logger.error('大文件处理失败，回退到传统方法', { 
          error: error.message,
          textLength: text.length 
        });
        // 如果大文件处理失败，回退到传统方法
      }
    }

    // 检查文本长度，如果超过限制则自动分割
    const maxTextLength = 8000; // 设置最大文本长度限制
    if (text.length > maxTextLength && splitCount === 0) {
      Logger.info('文本过长，自动进行预分割', { 
        textLength: text.length, 
        maxLength: maxTextLength 
      });
      
      // 分割文本为多个部分
      const parts = this.splitTextIntoChunks(text, maxTextLength);
      Logger.info('文本预分割完成', { partsCount: parts.length });
      
      // 处理每个部分
      const allSentences = [];
      for (let i = 0; i < parts.length; i++) {
        Logger.info(`处理第 ${i + 1}/${parts.length} 部分`, { 
          partLength: parts[i].length 
        });
        
        const partSentences = await this.splitSentences(parts[i], clientId, splitCount + 1);
        allSentences.push(...partSentences);
        
        // 部分间延迟，避免API限制
        if (i < parts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 重新分配ID
      const finalSentences = allSentences.map((sentence, index) => ({
        id: index + 1,
        text: sentence.text
      }));
      
      Logger.success('大文本分句处理完成', { 
        originalLength: text.length,
        totalSentences: finalSentences.length,
        partsProcessed: parts.length
      });
      
      return finalSentences;
    }

    // 构建分句提示词
    const prompt = this.buildSentenceSplitPrompt();

    try {
      Logger.info('开始AI分句处理', { 
        textLength: text.length, 
        splitCount,
        clientId 
      });

      // 调用DeepSeek API进行分句
      const response = await this.callDeepSeekAPI(prompt, text);
      
      // 解析分句结果
      const sentences = this.parseSentenceResponse(response);
      
      // 过滤和清理分句结果
      const cleanedSentences = sentences
        .filter(sentence => sentence.trim().length > 0) // 过滤空句子
        .map((sentence, index) => ({
          id: index + 1, // 重新生成ID
          text: sentence.trim() // 清理前后空格
        }));

      Logger.success('AI分句处理成功', { 
        originalLength: text.length,
        sentenceCount: cleanedSentences.length,
        splitCount 
      });

      return cleanedSentences;

    } catch (error) {
      Logger.error('AI分句处理失败', { 
        error: error.message,
        textLength: text.length,
        splitCount 
      });

      // 检查是否是输出长度过长错误或连接错误
      if ((this.isOutputTooLongError(error) || this.isConnectionError(error)) && splitCount < maxSplitCount) {
        Logger.info('检测到处理错误，开始分割文本', { 
          splitCount: splitCount + 1,
          errorType: this.isOutputTooLongError(error) ? 'output_too_long' : 'connection_error'
        });
        
        // 分割文本为两部分
        const midPoint = Math.floor(text.length / 2);
        
        // 寻找合适的分割点（避免在单词中间分割）
        let splitPoint = midPoint;
        while (splitPoint > 0 && text[splitPoint] !== ' ' && text[splitPoint] !== '\n') {
          splitPoint--;
        }
        
        // 如果找不到合适的分割点，使用中点
        if (splitPoint === 0) {
          splitPoint = midPoint;
        }

        const part1 = text.substring(0, splitPoint).trim();
        const part2 = text.substring(splitPoint).trim();

        Logger.debug('文本分割信息', {
          originalLength: text.length,
          part1Length: part1.length,
          part2Length: part2.length,
          splitPoint
        });

        // 递归处理两部分
        const [sentences1, sentences2] = await Promise.all([
          this.splitSentences(part1, clientId, splitCount + 1),
          this.splitSentences(part2, clientId, splitCount + 1)
        ]);

        // 合并结果并重新分配ID
        const combinedSentences = [...sentences1, ...sentences2].map((sentence, index) => ({
          id: index + 1,
          text: sentence.text
        }));

        Logger.success('分割文本处理成功', { 
          totalSentences: combinedSentences.length,
          part1Sentences: sentences1.length,
          part2Sentences: sentences2.length 
        });

        return combinedSentences;
      }

      // 其他错误直接抛出
      throw new Error(`分句处理失败: ${error.message}`);
    }
  }

  /**
   * 构建分句提示词
   * @returns {string} 分句提示词
   */
  buildSentenceSplitPrompt() {
    return `你是专业的文本分句助手。请将用户提供的文本按照语义和语法结构进行智能分句，保持句子的完整性和自然性。

要求：
1. 按语义单元分句，不要破坏语法结构
2. 保持原文的意思和语气不变
3. 每行输出一个完整句子
4. 不要添加、删除或修改任何标点符号，保持原文风格
5. 不要添加序号、标记或其他格式
6. 直接输出分句结果，每句一行

注意：
- 对于字幕文件，请将相关的字幕块合并成完整句子
- 对于文本文件，请按照自然的语义边界分句
- 保持原文的连贯性和完整性`;
  }

  /**
   * 解析分句响应结果
   * @param {string} response - AI响应内容
   * @returns {Array} 分句数组
   */
  parseSentenceResponse(response) {
    // 按行分割并过滤空行
    const sentences = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^\d+[\.\)]/)) // 过滤掉序号行
      .filter(line => !line.startsWith('-')) // 过滤掉列表标记
      .filter(line => line.length > 5); // 过滤掉过短的句子

    Logger.debug('分句响应解析', {
      rawResponse: response,
      parsedSentences: sentences.length,
      sentences: sentences.slice(0, 3) // 记录前3句用于调试
    });

    return sentences;
  }

  /**
   * 检查是否是输出长度过长错误
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否是输出长度过长错误
   */
  isOutputTooLongError(error) {
    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('output') && errorMessage.includes('too long') ||
           errorMessage.includes('length') && errorMessage.includes('limit') ||
           errorMessage.includes('token') && errorMessage.includes('limit') ||
           errorMessage.includes('max_tokens');
  }

  /**
   * 检查是否是连接错误
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否是连接错误
   */
  isConnectionError(error) {
    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('econnreset') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('enotfound') ||
           errorMessage.includes('aborted') ||
           errorMessage.includes('network') ||
           errorMessage.includes('connection');
  }

  /**
   * 将大文本分割为多个块
   * @param {string} text - 要分割的文本
   * @param {number} maxLength - 每个块的最大长度
   * @returns {Array} 文本块数组
   */
  splitTextIntoChunks(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    // 按句子分割文本
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      // 如果当前块加上新句子会超过限制，则开始新块
      if (currentChunk.length + trimmedSentence.length + 2 > maxLength) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // 如果单个句子就超过限制，强制分割
        if (trimmedSentence.length > maxLength) {
          const subChunks = this.forceSplitText(trimmedSentence, maxLength);
          chunks.push(...subChunks);
        } else {
          currentChunk = trimmedSentence;
        }
      } else {
        currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
      }
    }
    
    // 添加最后一个块
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * 强制分割过长的文本
   * @param {string} text - 要分割的文本
   * @param {number} maxLength - 每个块的最大长度
   * @returns {Array} 文本块数组
   */
  forceSplitText(text, maxLength) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + maxLength;
      
      // 如果不是在文本末尾，尝试在单词边界分割
      if (end < text.length) {
        while (end > start && text[end] !== ' ' && text[end] !== '\n') {
          end--;
        }
        
        // 如果找不到合适的分割点，强制分割
        if (end === start) {
          end = start + maxLength;
        }
      } else {
        end = text.length;
      }
      
      chunks.push(text.substring(start, end).trim());
      start = end;
    }
    
    return chunks;
  }



  /**
   * 智能分段并生成段落标题
   * @param {Array} sentences - 句子数组
   * @param {string} englishLevel - 英语水平
   * @param {string} clientId - 客户端ID
   * @returns {Promise<Array>} 处理后的段落数组
   */
  async generateParagraphsWithTitles(sentences, englishLevel, clientId) {
    Logger.info('开始智能分段和标题生成', { 
      sentenceCount: sentences.length, 
      englishLevel,
      clientId 
    });

    // 检查句子数量，如果过多则分批处理
    const maxSentencesPerBatch = 50; // 每批最多处理50个句子
    if (sentences.length > maxSentencesPerBatch) {
      Logger.info('句子数量过多，进行分批处理', { 
        totalSentences: sentences.length,
        maxPerBatch: maxSentencesPerBatch
      });
      
      return await this.generateParagraphsInBatches(sentences, englishLevel, clientId, maxSentencesPerBatch);
    }

    // 小批量直接处理
    return await this.processParagraphBatch(sentences, englishLevel, clientId);
  }

  /**
   * 分批处理段落生成
   * @param {Array} sentences - 句子数组
   * @param {string} englishLevel - 英语水平
   * @param {string} clientId - 客户端ID
   * @param {number} batchSize - 批次大小
   * @returns {Promise<Array>} 处理后的段落数组
   */
  async generateParagraphsInBatches(sentences, englishLevel, clientId, batchSize) {
    const batches = [];
    
    // 将句子分批
    for (let i = 0; i < sentences.length; i += batchSize) {
      batches.push(sentences.slice(i, i + batchSize));
    }
    
    Logger.info('分批处理设置完成', { 
      totalBatches: batches.length,
      batchSize: batchSize
    });
    
    const allParagraphs = [];
    let globalSentenceId = 1;
    
    // 处理每个批次
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      Logger.info(`处理第 ${batchIndex + 1}/${batches.length} 批`, { 
        batchSize: batch.length 
      });
      
      try {
        const batchParagraphs = await this.processParagraphBatch(batch, englishLevel, clientId);
        
        // 重新分配ID
        const adjustedParagraphs = batchParagraphs.map(paragraph => ({
          ...paragraph,
          id: allParagraphs.length + paragraph.id,
          sentences: paragraph.sentences.map(sentence => ({
            ...sentence,
            id: globalSentenceId++
          }))
        }));
        
        allParagraphs.push(...adjustedParagraphs);
        
        Logger.success(`第 ${batchIndex + 1} 批处理成功`, { 
          paragraphCount: batchParagraphs.length 
        });
        
      } catch (error) {
        Logger.error(`第 ${batchIndex + 1} 批处理失败`, { 
          error: error.message,
          batchSize: batch.length 
        });
        
        // 直接抛出错误，不使用降级方案
        Logger.error(`批次 ${batchIndex + 1} 处理失败，停止处理`);
        throw error;
      }
      
      // 批次间延迟
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    Logger.success('分批段落处理完成', { 
      totalParagraphs: allParagraphs.length,
      totalBatches: batches.length
    });
    
    return allParagraphs;
  }

  /**
   * 处理单个批次的段落生成
   * @param {Array} sentences - 句子数组
   * @param {string} englishLevel - 英语水平
   * @param {string} clientId - 客户端ID
   * @returns {Promise<Array>} 处理后的段落数组
   */
  async processParagraphBatch(sentences, englishLevel, clientId) {
    const contextualPrompt = this.buildParagraphAndTitlePrompt(sentences, englishLevel);
    
    // 检查提示词长度
    if (contextualPrompt.length > 15000) {
      Logger.warn('提示词过长，进行简化处理', { 
        promptLength: contextualPrompt.length,
        sentenceCount: sentences.length
      });
      
      // 如果提示词过长，减少句子数量
      const maxSentencesForPrompt = Math.floor(sentences.length * 0.7); // 减少30%
      const reducedSentences = sentences.slice(0, maxSentencesForPrompt);
      const reducedPrompt = this.buildParagraphAndTitlePrompt(reducedSentences, englishLevel);
      
      const response = await this.callDeepSeekAPI(reducedPrompt, '');
      const result = this.validateAndCleanJSON(response, 'array');
      
      if (Array.isArray(result)) {
        const paragraphs = this.convertToParagraphStructure(result);
        
        // 如果还有剩余句子，抛出错误
        if (sentences.length > maxSentencesForPrompt) {
          const remainingCount = sentences.length - maxSentencesForPrompt;
          throw new Error(`提示词过长，无法处理所有句子。已处理 ${maxSentencesForPrompt} 个句子，还有 ${remainingCount} 个句子未处理`);
        }
        
        return paragraphs;
      }
    }

    try {
      const response = await this.callDeepSeekAPI(contextualPrompt, '');
      const result = this.validateAndCleanJSON(response, 'array');

      if (Array.isArray(result)) {
        const paragraphs = this.convertToParagraphStructure(result);
        
        Logger.success('段落批次处理成功', { 
          paragraphCount: paragraphs.length,
          sentenceCount: sentences.length
        });

        return paragraphs;
      } else {
        Logger.error('返回格式不匹配', { 
          actualType: typeof result,
          resultPreview: result
        });
        throw new Error('返回格式不匹配');
      }
    } catch (error) {
      Logger.error('段落批次处理失败', { 
        error: error.message,
        sentenceCount: sentences.length 
      });
      
      // 直接抛出错误，不使用降级方案
      throw error;
    }
  }

  /**
   * 转换为段落结构
   * @param {Array} result - AI返回的结果
   * @returns {Array} 段落数组
   */
  convertToParagraphStructure(result) {
    return result.map((item, index) => ({
      id: index + 1,
      sentences: item.sentences.map((sentenceText, sentenceIndex) => ({
        id: sentenceIndex + 1,
        text: sentenceText
      })),
      title: item.title,
      learningObjective: item.objective,
      focusArea: item.focus,
      relevance: item.relevance
    }));
  }



  /**
   * 生成句子解释
   * @param {Array} sentences - 句子数组
   * @param {string} englishLevel - 英语水平
   * @param {string} clientId - 客户端ID
   * @returns {Promise<Array>} 处理后的句子数组
   */
  async generateSentenceExplanations(sentences, englishLevel, clientId) {
    Logger.info('开始生成句子解释', { 
      sentenceCount: sentences.length, 
      englishLevel,
      clientId 
    });

    // 检查是否为大文件处理
    const totalTextLength = sentences.reduce((sum, sentence) => sum + sentence.text.length, 0);
    const largeFileThreshold = 20000; // 20KB作为大文件阈值
    
    if (totalTextLength > largeFileThreshold) {
      Logger.info('检测到大文件，使用大文件处理策略', { 
        totalTextLength: totalTextLength, 
        threshold: largeFileThreshold 
      });
      
      try {
        // 将句子数组转换为文本
        const text = sentences.map(s => s.text).join('. ');
        const explanations = await this.processLargeFile(text, 'explain', englishLevel, clientId);
        
        // 将解释结果分配回句子
        sentences.forEach((sentence, index) => {
          sentence.explanation = explanations[index] || '解释生成失败';
        });
        
        Logger.success('大文件解释处理完成', { 
          totalSentences: sentences.length,
          explanationsGenerated: explanations.length
        });
        
        return sentences;
      } catch (error) {
        Logger.error('大文件解释处理失败，回退到传统方法', { 
          error: error.message,
          totalTextLength: totalTextLength 
        });
        // 如果大文件处理失败，回退到传统方法
      }
    }

    const batchSize = config.processing.batchSize;
    const batches = [];
    const failedBatches = [];

    for (let i = 0; i < sentences.length; i += batchSize) {
      batches.push(sentences.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchPrompt = this.buildExplanationPrompt(batch, englishLevel);

      try {
        Logger.info(`处理解释批次 ${batchIndex + 1}/${batches.length}`, { 
          batchSize: batch.length,
          promptLength: batchPrompt.length
        });

        const response = await this.callDeepSeekAPI(batchPrompt, '');
        const explanations = this.validateAndCleanJSON(response, 'array');

        if (Array.isArray(explanations) && explanations.length === batch.length) {
          batch.forEach((sentence, index) => {
            sentence.explanation = explanations[index];
          });

          Logger.success('批次解释生成成功', { 
            batchIndex: batchIndex + 1,
            batchSize: batch.length 
          });
        } else {
          throw new Error('返回格式不匹配');
        }
      } catch (error) {
        Logger.error('批次解释生成失败', { 
          batchIndex: batchIndex + 1,
          error: error.message,
          errorDetails: error.details || null,
          batchSize: batch.length
        });
        
        // 记录失败的批次
        failedBatches.push({
          batchIndex: batchIndex + 1,
          batch: batch,
          error: error.message,
          details: error.details || null
        });
        
        // 直接抛出错误，不使用降级方案
        Logger.error(`批次 ${batchIndex + 1} 处理失败，停止处理`);
        throw error;
      }

      // 批次间延迟，避免API限制
      if (batchIndex < batches.length - 1) {
        const delay = config.processing.batchDelay;
        Logger.debug(`批次间延迟 ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    Logger.success('句子解释生成完成', { 
      totalSentences: sentences.length,
      processedBatches: batches.length
    });

    return sentences;
  }

  /**
   * 生成词汇分析
   * @param {string} text - 完整文本
   * @param {string} englishLevel - 英语水平
   * @returns {Promise<Array>} 词汇分析数组
   */
  async generateVocabularyAnalysis(text, englishLevel) {
    Logger.info('开始生成词汇分析', { 
      textLength: text.length, 
      englishLevel 
    });

    // 检查是否为大文件处理
    const largeFileThreshold = 25000; // 25KB作为大文件阈值
    
    if (text.length > largeFileThreshold) {
      Logger.info('检测到大文件，使用大文件处理策略', { 
        textLength: text.length, 
        threshold: largeFileThreshold 
      });
      
      try {
        return await this.processLargeFile(text, 'vocabulary', englishLevel, null);
      } catch (error) {
        Logger.error('大文件词汇分析失败，回退到传统方法', { 
          error: error.message,
          textLength: text.length 
        });
        // 如果大文件处理失败，回退到传统方法
      }
    }

    try {
      const vocabPrompt = this.buildVocabularyPrompt(text, englishLevel);
      const response = await this.callDeepSeekAPI(vocabPrompt, '');
      const vocabulary = this.validateAndCleanJSON(response, 'array');

      if (Array.isArray(vocabulary)) {
        const filteredVocabulary = vocabulary
          .filter(vocab => vocab.term && vocab.explanation && vocab.usage && vocab.examples)
          .slice(0, 8);

        Logger.success('词汇分析生成成功', { count: filteredVocabulary.length });
        return filteredVocabulary;
      } else {
        throw new Error('返回格式不是数组');
      }
    } catch (error) {
      Logger.error('词汇分析生成失败', { error: error.message });
      throw error; // 直接抛出错误，不使用降级方案
    }
  }


  /**
   * 构建分段和标题生成提示词
   * @param {Array} sentences - 句子数组
   * @param {string} englishLevel - 英语水平
   * @returns {string} 提示词
   */
  buildParagraphAndTitlePrompt(sentences, englishLevel) {
    const sentenceTexts = sentences.map(s => s.text);

    return `You are a JSON-only response AI. You must return ONLY valid JSON without any explanation, introduction, or additional text.

TASK: Intelligently group sentences into meaningful paragraphs and generate titles for each paragraph.

CONTEXT: This is part of a larger English learning material.

LEARNING OBJECTIVES:
- Target level: ${englishLevel}
- Focus: ${this.getLevelFocus(englishLevel)}

REQUIREMENTS:
1. Group sentences into serveral meaningful paragraphs based on semantic coherence
2. Each paragraph should contain serveral sentences that are thematically related
3. Generate an engaging title for each paragraph
4. Ensure logical flow and natural transitions between paragraphs

For each paragraph, create:
1. An engaging English title (3-5 words)
2. A clear learning objective
3. Key grammar/vocabulary focus
4. Relevance to the content
5. The sentences that belong to this paragraph

Sentences to analyze and group:
${sentenceTexts.map((text, i) => 
  `${i+1}. "${text}"`
).join('\n')}

CRITICAL: Return ONLY the JSON array below, no other text:
[{
  "title": "Engaging English Title",
  "objective": "Students will learn to...",
  "focus": "past tense/vocabulary/phrasal verbs",
  "relevance": "how this relates to the content",
  "sentences": ["sentence 1", "sentence 2", ...]
}]`;
  }

  /**
   * 构建解释生成提示词
   * @param {Array} batch - 句子批次
   * @param {string} englishLevel - 英语水平
   * @returns {string} 提示词
   */
  buildExplanationPrompt(batch, englishLevel) {
    return `You are a JSON-only response AI. You must return ONLY valid JSON without any explanation, introduction, or additional text.

TASK: Explain these ${batch.length} English sentences in simple English suitable for ${englishLevel} level learners. 
For each sentence, provide a concise explanation (under 80 words) focusing on meaning and key grammar points.

Sentences to explain:
${batch.map((s, i) => `${i + 1}. "${s.text}"`).join('\n')}

CRITICAL: Return ONLY the JSON array below, no other text:
["Explanation 1", "Explanation 2", ...]`;
  }

  /**
   * 构建词汇分析提示词
   * @param {string} text - 文本内容
   * @param {string} englishLevel - 英语水平
   * @returns {string} 提示词
   */
  buildVocabularyPrompt(text, englishLevel) {
    return `You are a JSON-only response AI. You must return ONLY valid JSON without any explanation, introduction, or additional text.

TASK: Analyze this English text and quickly identify 6-8 key vocabulary words suitable for ${englishLevel} learners.

Text to analyze: ${text.substring(0, 1000)}

CRITICAL: Return ONLY the JSON array below, no other text:
[{"term":"word","explanation":"simple meaning","usage":"how to use","examples":["ex1","ex2"]}]`;
  }

  /**
   * 验证和清理JSON响应
   * @param {string} response - AI响应内容
   * @param {string} expectedType - 期望的数据类型 ('array' 或 'object')
   * @returns {object|array} 解析后的JSON数据
   */
  validateAndCleanJSON(response, expectedType = 'array') {
    try {
      // 第一步：移除可能的markdown代码块标记
      let cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim();
      
      // 第二步：查找JSON开始和结束位置
      const jsonStart = cleanResponse.indexOf('[');
      const jsonEnd = cleanResponse.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      // 第三步：尝试修复常见的JSON格式问题
      cleanResponse = this.fixCommonJSONIssues(cleanResponse);
      
      // 第四步：尝试解析JSON
      const parsed = JSON.parse(cleanResponse);
      
      // 第五步：验证数据类型
      if (expectedType === 'array' && !Array.isArray(parsed)) {
        throw new Error('Expected array but got: ' + typeof parsed);
      }
      
      Logger.debug('JSON验证成功', { 
        originalLength: response.length,
        cleanedLength: cleanResponse.length,
        dataType: Array.isArray(parsed) ? 'array' : 'object',
        itemCount: Array.isArray(parsed) ? parsed.length : 'N/A'
      });
      
      return parsed;
      
    } catch (error) {
      Logger.error('JSON验证失败', { 
        error: error.message,
        responsePreview: response.substring(0, 200) + '...',
        fullResponse: response, // 记录完整响应
        expectedType 
      });
      
      throw new Error(`JSON_VALIDATION_FAILED: ${error.message}`);
    }
  }

  /**
   * 修复常见的JSON格式问题
   * @param {string} jsonString - JSON字符串
   * @returns {string} 修复后的JSON字符串
   */
  fixCommonJSONIssues(jsonString) {
    let fixed = jsonString;
    
    // 修复1: 移除末尾的逗号
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // 修复2: 修复缺少的逗号（在属性之间）
    fixed = fixed.replace(/"\s*\n\s*"/g, '",\n  "');
    
    // 修复3: 修复缺少的引号（属性名）
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // 修复4: 修复多余的逗号
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // 修复5: 修复换行符问题
    fixed = fixed.replace(/\n\s*\n/g, '\n');
    
    // 修复6: 确保数组元素之间有逗号
    fixed = fixed.replace(/}\s*\n\s*{/g, '},\n  {');
    
    // 修复7: 修复缺少的逗号（在对象属性之间）
    fixed = fixed.replace(/"\s*\n\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '",\n  "$1":');
    
    // 修复8: 修复缺少的逗号（在字符串值之后）
    fixed = fixed.replace(/"\s*\n\s*}/g, '"\n  }');
    
    // 修复9: 修复缺少的逗号（在字符串值之后，后面跟对象）
    fixed = fixed.replace(/"\s*\n\s*,\s*\n\s*{/g, '",\n  {');
    
    Logger.debug('JSON修复完成', { 
      originalLength: jsonString.length,
      fixedLength: fixed.length,
      changes: jsonString !== fixed 
    });
    
    return fixed;
  }

  /**
   * 获取英语水平重点
   * @param {string} englishLevel - 英语水平
   * @returns {string} 重点描述
   */
  getLevelFocus(englishLevel) {
    const focusMap = {
      'CET-4': 'basic vocabulary and grammar',
      'CET-6': 'intermediate expressions and complex structures',
      'IELTS': 'academic vocabulary and formal expressions',
      'TOEFL': 'advanced academic English and precise terminology'
    };
    return focusMap[englishLevel] || 'general English skills';
  }

  /**
   * 智能处理大文件
   * 针对大文件进行特殊优化，包括智能分块、渐进式处理和错误恢复
   * @param {string} text - 大文件文本内容
   * @param {string} processingType - 处理类型 ('split', 'explain', 'vocabulary')
   * @param {string} englishLevel - 英语水平
   * @param {string} clientId - 客户端ID
   * @returns {Promise<any>} 处理结果
   */
  async processLargeFile(text, processingType, englishLevel, clientId) {
    const textLength = text.length;
    Logger.info('开始大文件处理', {
      textLength: textLength,
      processingType: processingType,
      englishLevel: englishLevel,
      clientId: clientId
    });

    // 根据处理类型确定最佳分块策略
    const chunkStrategy = this.getChunkStrategy(processingType, textLength);
    Logger.info('使用分块策略', chunkStrategy);

    // 智能分块
    const chunks = this.intelligentChunking(text, chunkStrategy);
    Logger.info('文件分块完成', {
      totalChunks: chunks.length,
      averageChunkSize: Math.round(textLength / chunks.length)
    });

    // 渐进式处理
    const results = [];
    const failedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      Logger.info(`处理第 ${i + 1}/${chunks.length} 块`, {
        chunkSize: chunk.text.length,
        progress: `${((i + 1) / chunks.length * 100).toFixed(1)}%`
      });

      try {
        let result;
        switch (processingType) {
          case 'split':
            result = await this.splitSentences(chunk.text, clientId);
            break;
          case 'explain':
            result = await this.generateSentenceExplanations(chunk.text, englishLevel, clientId);
            break;
          case 'vocabulary':
            result = await this.generateVocabularyAnalysis(chunk.text, englishLevel);
            break;
          default:
            throw new Error(`未知的处理类型: ${processingType}`);
        }

        results.push({
          chunkIndex: i,
          chunkSize: chunk.text.length,
          result: result,
          success: true
        });

        Logger.success(`第 ${i + 1} 块处理成功`, {
          resultSize: Array.isArray(result) ? result.length : 'N/A'
        });

      } catch (error) {
        Logger.error(`第 ${i + 1} 块处理失败`, {
          error: error.message,
          errorType: error.errorType || 'UNKNOWN',
          chunkSize: chunk.text.length
        });

        failedChunks.push({
          chunkIndex: i,
          chunk: chunk,
          error: error.message,
          errorType: error.errorType || 'UNKNOWN'
        });

        // 对于大文件，允许部分失败，继续处理其他块
        if (processingType === 'vocabulary') {
          // 词汇分析允许部分失败
          results.push({
            chunkIndex: i,
            chunkSize: chunk.text.length,
            result: [],
            success: false,
            error: error.message
          });
        } else {
          // 其他处理类型失败则停止
          throw new Error(`大文件处理失败: 第 ${i + 1} 块处理失败 - ${error.message}`);
        }
      }

      // 块间延迟，避免API限制
      if (i < chunks.length - 1) {
        const delay = this.calculateChunkDelay(i, chunks.length, processingType);
        Logger.debug(`块间延迟 ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 合并结果
    const mergedResult = this.mergeChunkResults(results, processingType);
    
    Logger.success('大文件处理完成', {
      totalChunks: chunks.length,
      successfulChunks: results.filter(r => r.success).length,
      failedChunks: failedChunks.length,
      finalResultSize: Array.isArray(mergedResult) ? mergedResult.length : 'N/A'
    });

    return mergedResult;
  }

  /**
   * 获取分块策略
   * @param {string} processingType - 处理类型
   * @param {number} textLength - 文本长度
   * @returns {object} 分块策略
   */
  getChunkStrategy(processingType, textLength) {
    const strategies = {
      'split': {
        maxChunkSize: 6000, // 分句处理，较小的块
        overlapSize: 200, // 重叠部分，保持句子完整性
        minChunkSize: 1000, // 最小块大小
        description: '分句处理策略：小块处理，保持句子完整性'
      },
      'explain': {
        maxChunkSize: 4000, // 解释处理，更小的块
        overlapSize: 100, // 较小的重叠
        minChunkSize: 500, // 最小块大小
        description: '解释处理策略：小块处理，提高成功率'
      },
      'vocabulary': {
        maxChunkSize: 8000, // 词汇分析，较大的块
        overlapSize: 300, // 较大的重叠，确保词汇不遗漏
        minChunkSize: 2000, // 最小块大小
        description: '词汇分析策略：大块处理，提高词汇覆盖率'
      }
    };

    const strategy = strategies[processingType] || strategies['split'];
    
    // 根据文本长度调整策略
    if (textLength > 50000) {
      strategy.maxChunkSize = Math.floor(strategy.maxChunkSize * 0.8); // 大文件使用更小的块
      strategy.overlapSize = Math.floor(strategy.overlapSize * 1.2); // 增加重叠
    }

    return strategy;
  }

  /**
   * 智能分块
   * @param {string} text - 文本内容
   * @param {object} strategy - 分块策略
   * @returns {Array} 文本块数组
   */
  intelligentChunking(text, strategy) {
    const chunks = [];
    let currentChunk = '';
    let startIndex = 0;

    // 按句子分割文本
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      
      // 如果当前块加上新句子会超过限制
      if (currentChunk.length + sentence.length + 2 > strategy.maxChunkSize) {
        if (currentChunk.length > 0) {
          // 添加当前块
          chunks.push({
            text: currentChunk.trim(),
            startIndex: startIndex,
            endIndex: startIndex + currentChunk.length
          });
          
          // 计算重叠部分
          const overlapText = this.calculateOverlap(currentChunk, strategy.overlapSize);
          currentChunk = overlapText + '. ' + sentence;
          startIndex = startIndex + currentChunk.length - overlapText.length - 2;
        } else {
          // 单个句子就超过限制，强制分割
          const subChunks = this.forceSplitSentence(sentence, strategy.maxChunkSize);
          chunks.push(...subChunks.map((chunk, index) => ({
            text: chunk,
            startIndex: startIndex + index * strategy.maxChunkSize,
            endIndex: startIndex + (index + 1) * strategy.maxChunkSize
          })));
          currentChunk = '';
          startIndex += sentence.length;
        }
      } else {
        currentChunk += (currentChunk.length > 0 ? '. ' : '') + sentence;
      }
    }

    // 添加最后一个块
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex: startIndex,
        endIndex: startIndex + currentChunk.length
      });
    }

    // 过滤掉过小的块
    return chunks.filter(chunk => chunk.text.length >= strategy.minChunkSize);
  }

  /**
   * 计算重叠部分
   * @param {string} text - 文本内容
   * @param {number} overlapSize - 重叠大小
   * @returns {string} 重叠部分
   */
  calculateOverlap(text, overlapSize) {
    if (text.length <= overlapSize) {
      return text;
    }

    // 从末尾开始，寻找句子边界
    let overlapText = text.substring(text.length - overlapSize);
    const lastSentenceEnd = overlapText.lastIndexOf('.');
    
    if (lastSentenceEnd > 0) {
      overlapText = overlapText.substring(lastSentenceEnd + 1).trim();
    }

    return overlapText;
  }

  /**
   * 强制分割句子
   * @param {string} sentence - 句子内容
   * @param {number} maxSize - 最大大小
   * @returns {Array} 分割后的块
   */
  forceSplitSentence(sentence, maxSize) {
    const chunks = [];
    let start = 0;

    while (start < sentence.length) {
      let end = start + maxSize;
      
      if (end < sentence.length) {
        // 尝试在单词边界分割
        while (end > start && sentence[end] !== ' ' && sentence[end] !== '\n') {
          end--;
        }
        
        if (end === start) {
          end = start + maxSize; // 强制分割
        }
      } else {
        end = sentence.length;
      }

      chunks.push(sentence.substring(start, end).trim());
      start = end;
    }

    return chunks;
  }

  /**
   * 计算块间延迟
   * @param {number} chunkIndex - 当前块索引
   * @param {number} totalChunks - 总块数
   * @param {string} processingType - 处理类型
   * @returns {number} 延迟时间（毫秒）
   */
  calculateChunkDelay(chunkIndex, totalChunks, processingType) {
    const baseDelay = config.processing.batchDelay;
    
    // 根据处理类型调整延迟
    let delayMultiplier = 1;
    switch (processingType) {
      case 'split':
        delayMultiplier = 0.5; // 分句处理，较短的延迟
        break;
      case 'explain':
        delayMultiplier = 1.0; // 解释处理，标准延迟
        break;
      case 'vocabulary':
        delayMultiplier = 0.8; // 词汇分析，较短延迟
        break;
    }

    // 根据进度调整延迟（后期块延迟稍长）
    const progressRatio = chunkIndex / totalChunks;
    const progressMultiplier = 1 + (progressRatio * 0.5);

    return Math.round(baseDelay * delayMultiplier * progressMultiplier);
  }

  /**
   * 合并块结果
   * @param {Array} results - 块处理结果
   * @param {string} processingType - 处理类型
   * @returns {any} 合并后的结果
   */
  mergeChunkResults(results, processingType) {
    const successfulResults = results.filter(r => r.success);
    
    switch (processingType) {
      case 'split':
        // 合并句子，重新分配ID
        const allSentences = [];
        let sentenceId = 1;
        successfulResults.forEach(chunkResult => {
          if (Array.isArray(chunkResult.result)) {
            chunkResult.result.forEach(sentence => {
              allSentences.push({
                id: sentenceId++,
                text: sentence.text || sentence
              });
            });
          }
        });
        return allSentences;

      case 'explain':
        // 合并解释结果
        const allExplanations = [];
        successfulResults.forEach(chunkResult => {
          if (Array.isArray(chunkResult.result)) {
            allExplanations.push(...chunkResult.result);
          }
        });
        return allExplanations;

      case 'vocabulary':
        // 合并词汇分析，去重
        const vocabularyMap = new Map();
        successfulResults.forEach(chunkResult => {
          if (Array.isArray(chunkResult.result)) {
            chunkResult.result.forEach(vocab => {
              if (vocab.term && !vocabularyMap.has(vocab.term)) {
                vocabularyMap.set(vocab.term, vocab);
              }
            });
          }
        });
        return Array.from(vocabularyMap.values()).slice(0, 8); // 限制词汇数量

      default:
        return results;
    }
  }


}

// 创建单例实例
const aiService = new AIService();

module.exports = aiService; 