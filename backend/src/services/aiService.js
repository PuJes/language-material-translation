/**
 * AI服务模块
 * 处理AI API调用、智能内容生成和降级处理
 */

const axios = require('axios');
const Logger = require('../utils/logger');
const config = require('../config');

class AIService {
  constructor() {
    this.apiUrl = config.ai.apiUrl;
    this.apiKey = config.ai.apiKey;
    this.model = config.ai.model;
    this.maxTokens = config.ai.maxTokens;
    this.temperature = config.ai.temperature;
    this.timeout = config.ai.timeout;
    this.retries = config.ai.retries;
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
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        Logger.api('DeepSeek API调用', { 
          attempt: i + 1, 
          textLength: text.length,
          promptLength: prompt.length 
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
          timeout: this.timeout,
          httpsAgent: new (require('https').Agent)({
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 5,
            maxFreeSockets: 5,
            timeout: this.timeout,
            freeSocketTimeout: 30000
          })
        });

        const result = response.data.choices[0].message.content;
        Logger.api('DeepSeek API调用成功', { 
          responseLength: result.length,
          attempt: i + 1 
        });
        
        // 记录完整的API响应用于调试
        Logger.debug('完整的API响应', { 
          response: result,
          responseLength: result.length 
        });
        
        return result;

      } catch (error) {
        Logger.error(`DeepSeek API调用失败 (第${i + 1}次)`, { 
          error: error.message,
          code: error.code,
          status: error.response?.status 
        });

        if (i === maxRetries - 1) {
          throw new Error(`AI_API_FAILED: ${error.code || error.message}`);
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
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

      // 检查是否是输出长度过长错误
      if (this.isOutputTooLongError(error) && splitCount < maxSplitCount) {
        Logger.info('检测到输出长度过长，开始分割文本', { splitCount: splitCount + 1 });
        
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

    const contextualPrompt = this.buildParagraphAndTitlePrompt(sentences, englishLevel);

    try {
      const response = await this.callDeepSeekAPI(contextualPrompt, '');
      const result = this.validateAndCleanJSON(response, 'array');

      if (Array.isArray(result)) {
        // 将AI返回的结果转换为段落结构
        const paragraphs = result.map((item, index) => ({
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

        Logger.success('智能分段和标题生成成功', { 
          paragraphCount: paragraphs.length
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
      Logger.error('智能分段和标题生成失败', { error: error.message });
      throw error; // 直接抛出错误，不使用降级方案
    }
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

    const batchSize = config.processing.batchSize;
    const batches = [];

    for (let i = 0; i < sentences.length; i += batchSize) {
      batches.push(sentences.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchPrompt = this.buildExplanationPrompt(batch, englishLevel);

      try {
        const response = await this.callDeepSeekAPI(batchPrompt, '');
        const explanations = this.validateAndCleanJSON(response, 'array');

        if (Array.isArray(explanations) && explanations.length === batch.length) {
          batch.forEach((sentence, index) => {
            sentence.explanation = explanations[index];
          });

          Logger.debug('批次解释生成成功', { 
            batchIndex: batchIndex + 1,
            batchSize: batch.length 
          });
        } else {
          throw new Error('返回格式不匹配');
        }
      } catch (error) {
        Logger.error('批次解释生成失败', { 
          batchIndex: batchIndex + 1,
          error: error.message 
        });
        
        throw error; // 直接抛出错误，不使用降级方案
      }

      // 批次间延迟
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, config.processing.batchDelay));
      }
    }

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
   * 生成降级标题
   * @param {Array} paragraphs - 段落数组
   * @param {Array} textsForTitles - 标题文本数组
   * @param {string} contentType - 内容类型
   * @returns {Array} 处理后的段落数组
   */
  generateFallbackTitles(paragraphs, textsForTitles, contentType) {
    const fallbackTitles = textsForTitles.map((text, i) => {
      const type = this.detectContentType(text);
      return `${this.getContentPrefix(type)} ${i + 1}: ${this.extractSimpleTopic(text)}`;
    });

    fallbackTitles.forEach((title, index) => {
      paragraphs[index].title = title;
      paragraphs[index].learningObjective = `Learn key elements in ${contentType}`;
      paragraphs[index].focusArea = 'vocabulary and grammar';
      paragraphs[index].relevance = `Relevant to ${contentType}`;
    });

    Logger.info('使用降级标题生成', { count: paragraphs.length });
    return paragraphs;
  }

  /**
   * 生成降级解释
   * @param {Array} batch - 句子批次
   */
  generateFallbackExplanations(batch) {
    batch.forEach(sentence => {
      const text = sentence.text;
      const wordCount = text.split(' ').length;
      sentence.explanation = `This sentence contains ${wordCount} words and expresses: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
    });
  }

  /**
   * 生成降级词汇
   * @param {string} englishLevel - 英语水平
   * @param {string} text - 文本内容
   * @returns {Array} 词汇数组
   */
  generateFallbackVocabulary(englishLevel, text) {
    const lowerText = text.toLowerCase();
    const levelConfig = config.englishLevels[englishLevel];
    const targetWords = levelConfig ? levelConfig.vocabulary : config.englishLevels['CET-4'].vocabulary;
    
    const foundWords = targetWords
      .filter(word => lowerText.includes(word.toLowerCase()))
      .slice(0, 6)
      .map(word => ({
        term: word,
        explanation: this.getWordExplanation(word),
        usage: this.getWordUsage(word),
        examples: this.getWordExamples(word)
      }));

    // 如果找到的词汇太少，添加通用词汇
    if (foundWords.length < 3) {
      const commonWords = ['understand', 'important', 'different', 'experience'];
      commonWords.forEach(word => {
        if (foundWords.length < 5 && !foundWords.some(fw => fw.term === word)) {
          foundWords.push({
            term: word,
            explanation: this.getWordExplanation(word),
            usage: this.getWordUsage(word),
            examples: this.getWordExamples(word)
          });
        }
      });
    }

    return foundWords;
  }

  /**
   * 获取内容前缀
   * @param {string} contentType - 内容类型
   * @returns {string} 前缀
   */
  getContentPrefix(contentType) {
    const prefixes = {
      'movie dialogue and scenes': '🎬 Scene',
      'academic content': '📚 Study',
      'business communication': '💼 Business',
      'daily conversation': '💬 Daily',
      'travel situations': '✈️ Travel',
      'general English content': '📖 Section'
    };
    return prefixes[contentType] || '📖 Section';
  }

  /**
   * 提取简单主题
   * @param {string} text - 文本内容
   * @returns {string} 主题
   */
  extractSimpleTopic(text) {
    const words = text.split(' ').slice(0, 3);
    return words.join(' ').replace(/[.!?]/g, '');
  }

  /**
   * 获取词汇解释
   * @param {string} word - 词汇
   * @returns {string} 解释
   */
  getWordExplanation(word) {
    const explanations = {
      'important': 'Having great significance or value; essential',
      'different': 'Not the same as another; distinct in nature',
      'understand': 'To comprehend the meaning or importance of something',
      'experience': 'Knowledge or skill gained through practice or exposure',
      'comprehensive': 'Including everything; complete and thorough',
      'significant': 'Important; having a notable effect or meaning',
      'demonstrate': 'To show clearly by giving proof or evidence',
      'establish': 'To set up; to create or found something'
    };
    return explanations[word] || `A word commonly used in ${word} contexts`;
  }

  /**
   * 获取词汇用法
   * @param {string} word - 词汇
   * @returns {string} 用法
   */
  getWordUsage(word) {
    const usages = {
      'important': 'Used to emphasize significance or priority',
      'different': 'Used to show contrast or comparison',
      'understand': 'Often used with concepts, ideas, or situations',
      'experience': 'Can be used as noun (an experience) or verb (to experience)',
      'comprehensive': 'Often used to describe complete coverage or analysis',
      'significant': 'Used to highlight importance or meaningful impact',
      'demonstrate': 'Frequently used in academic and professional contexts',
      'establish': 'Common in business and academic writing'
    };
    return usages[word] || `Commonly used in academic and professional contexts`;
  }

  /**
   * 获取词汇例句
   * @param {string} word - 词汇
   * @returns {Array} 例句数组
   */
  getWordExamples(word) {
    const examples = {
      'important': [
        'It is important to study regularly.',
        'This discovery is very important for science.',
        'Time management is important for success.'
      ],
      'understand': [
        'I understand the concept now.',
        'It\'s important to understand cultural differences.',
        'Students need to understand the basic principles.'
      ],
      'comprehensive': [
        'We need a comprehensive study of the problem.',
        'The report provides comprehensive analysis.',
        'She has comprehensive knowledge of the subject.'
      ]
    };
    return examples[word] || [
      `Here is an example with ${word}.`,
      `The word ${word} is used in many contexts.`,
      `Understanding ${word} is important for learners.`
    ];
  }
}

// 创建单例实例
const aiService = new AIService();

module.exports = aiService; 