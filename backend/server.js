console.log('正在启动服务器...');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws'); // 引入 WebSocket 库
const { v4: uuidv4 } = require('uuid'); // 引入 uuid 库
const aiPrompts = require('./ai-prompts'); // 引入AI提示词配置
require('dotenv').config();
console.log('依赖加载完成');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // 支持React和Vite开发服务器
  credentials: true
}));
app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 使用时间戳和随机数生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.srt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .txt 和 .srt 格式的文件'), false);
    }
  }
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`   - 本地地址: http://localhost:${PORT}`);
  console.log(`   - 健康检查: http://localhost:${PORT}/health`);
  console.log(`   - API端点: http://localhost:${PORT}/api/upload`);
  console.log(`   - 优化模式: 批量处理已启用`);
});

server.on('error', (err) => {
  console.error('服务器启动失败:', err);
  process.exit(1);
});

// 设置 WebSocket 服务器
const wss = new WebSocket.Server({ server }); // 将 WebSocket 服务器绑定到现有的 HTTP 服务器

// 存储所有活动的 WebSocket 连接，使用 Map 存储 clientId -> ws 对象
const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = uuidv4(); // 为每个新连接生成唯一ID
  ws.clientId = clientId; // 将 clientId 附加到 ws 对象上
  clients.set(clientId, ws); // 将新连接添加到客户端 Map

  console.log(`✨ WebSocket 客户端已连接: ${clientId}`);
  // 立即将 clientId 发送回前端，以便前端在后续请求中使用
  ws.send(JSON.stringify({ type: 'connection_ack', clientId: clientId }));

  ws.on('close', () => {
    console.log(`💔 WebSocket 客户端已断开: ${ws.clientId}`);
    clients.delete(ws.clientId); // 从 Map 中移除断开的连接
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket 错误 (客户端: ${ws.clientId}):`, error);
  });
});

/**
 * 推送进度到指定 WebSocket 客户端
 * @param {string} clientId - 目标客户端的唯一ID
 * @param {object} message - 包含进度信息的对象
 */
function sendProgressToClient(clientId, message) {
  const client = clients.get(clientId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-785ecad89d344e9db906caf8d40625fb';
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

// 调用AI API - 优化版本
async function callDeepSeekAPI(prompt, text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[API调用] 尝试第${i + 1}次，请求长度: ${text.length}字符`);
      
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        stream: false,
        max_tokens: 3000,
        temperature: 0.5 // 降低温度提高一致性和速度
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 增加超时时间到2分钟
      });
      
      const result = response.data.choices[0].message.content;
      console.log(`[API调用] 成功，返回长度: ${result.length}字符`);
      return result;
      
    } catch (error) {
      console.error(`[API调用] 第${i + 1}次失败:`, error.message);
      
      if (i === retries - 1) {
        console.error('[API调用] 所有重试都失败了');
        if (error.response?.status === 401) {
          return 'API密钥错误，请检查配置';
        } else if (error.response?.status === 429) {
          return 'API调用频率过高，请稍后再试';
        } else if (error.code === 'ECONNABORTED') {
          return 'API调用超时，请重试';
        } else {
          return `AI服务暂时不可用: ${error.message}`;
        }
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// 内容类型检测函数
function detectContentType(fullText) {
  const text = fullText.toLowerCase();
  
  if (text.includes('movie') || text.includes('film') || text.includes('scene') || text.includes('subtitle')) {
    return 'movie dialogue and scenes';
  } else if (text.includes('academic') || text.includes('research') || text.includes('study') || text.includes('university')) {
    return 'academic content';
  } else if (text.includes('business') || text.includes('meeting') || text.includes('work') || text.includes('office')) {
    return 'business communication';
  } else if (text.includes('daily') || text.includes('conversation') || text.includes('chat') || text.includes('talk')) {
    return 'daily conversation';
  } else if (text.includes('travel') || text.includes('trip') || text.includes('hotel') || text.includes('airport')) {
    return 'travel situations';
  } else {
    return 'general English content';
  }
}

// 使用ai-prompts.js中的extractKeyElements函数
const extractKeyElements = aiPrompts.extractKeyElements;

// 上下文感知的段落标题生成 - 版本4优化
async function batchProcessTitles(paragraphs, englishLevel, clientId) {
  console.log('[AI处理] 开始上下文感知的段落标题生成...');
  
  // 添加防御性编程，过滤掉无效的段落
  const validParagraphs = paragraphs.filter(p => p && p.sentences && Array.isArray(p.sentences) && p.sentences.length > 0);
  
  if (validParagraphs.length === 0) {
    console.log('[标题生成] 没有有效的段落，跳过标题生成');
    return;
  }
  
  const textsForTitles = validParagraphs.map(p => 
    p.sentences.map(s => s && s.text ? s.text : '').filter(text => text.length > 0).join(' ')
  );
  
  console.log(`[标题生成] 准备为 ${validParagraphs.length} 个段落生成标题`);
  console.log(`[标题生成] 段落内容预览:`, textsForTitles.map(text => text.substring(0, 50) + '...'));
  
  // 构建完整上下文
  const fullContext = textsForTitles.join(' ');
  const contentType = detectContentType(fullContext);
  
  // 使用配置化的提示词
  const contextualPrompt = aiPrompts.generateTitlePrompt(englishLevel, contentType, textsForTitles);

  try {
    const response = await callDeepSeekAPI(contextualPrompt, '');
    console.log(`[标题生成] API返回原始响应:`, response.substring(0, 200));
    
    const cleanResponse = response.replace(/```json|```/g, '').trim();
    console.log(`[标题生成] 清理后响应:`, cleanResponse);
    
    let titles;
    try {
      titles = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.log(`[标题生成] JSON解析失败:`, parseError.message);
      console.log(`[标题生成] 尝试修复JSON格式...`);
      
      // 尝试提取JSON数组
      const jsonMatch = cleanResponse.match(/\[.*?\]/s);
      if (jsonMatch) {
        try {
          titles = JSON.parse(jsonMatch[0]);
          console.log(`[标题生成] 修复后解析成功:`, titles);
        } catch (fixError) {
          console.log(`[标题生成] 修复尝试失败:`, fixError.message);
          throw parseError;
        }
      } else {
        throw parseError;
      }
    }
    
    console.log(`[标题生成] 解析结果:`, titles);
    console.log(`[标题生成] 期望数量: ${validParagraphs.length}, 实际数量: ${titles ? titles.length : 0}`);
    
    if (Array.isArray(titles) && titles.length === validParagraphs.length) {
      validParagraphs.forEach((paragraph, index) => {
        paragraph.title = titles[index] || `Section ${index + 1}`;
      });
      console.log(`[标题生成] 成功生成 ${validParagraphs.length} 个段落标题`);
    } else {
      throw new Error(`返回格式不匹配: 期望${validParagraphs.length}个标题，实际${titles ? titles.length : 0}个`);
    }
  } catch (error) {
    console.log('[标题生成] 失败，使用默认标题:', error.message);
    validParagraphs.forEach((paragraph, index) => {
      paragraph.title = `Section ${index + 1}`;
    });
  }
}

// 批量生成句子解释 - 版本3优化（增强错误处理）
async function batchProcessExplanations(sentences, englishLevel, clientId) {
  console.log('[AI处理] 开始批量生成句子解释...');
  
  // 添加防御性编程，过滤掉无效的句子
  const validSentences = sentences.filter(s => s && s.text && s.text.trim().length > 0);
  
  if (validSentences.length === 0) {
    console.log('[批量解释] 没有有效的句子，跳过解释生成');
    return;
  }
  
  // 分批处理，每批最多3个句子（减少批次大小提高成功率）
  const batchSize = 3;
  const batches = [];
  
  for (let i = 0; i < validSentences.length; i += batchSize) {
    batches.push(validSentences.slice(i, i + batchSize));
  }
  
  const totalBatches = batches.length;
  const startPercentage = 35;
  const endPercentage = 85;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batch = batches[batchIndex];
    
    // 使用简化的提示词，提高成功率
    const batchPrompt = aiPrompts.generateExplanationPrompt(englishLevel, batch);

    let success = false;
    let retryCount = 0;
    const maxRetries = 2; // 每个批次最多重试2次

    while (!success && retryCount <= maxRetries) {
      try {
        console.log(`[批量解释] 批次 ${batchIndex + 1}/${totalBatches}，尝试 ${retryCount + 1}/${maxRetries + 1}`);
        
        const response = await callDeepSeekAPI(batchPrompt, '');
        
        // 增强的JSON解析和清理
        let cleanResponse = response.replace(/```json|```/g, '').trim();
        
        // 尝试修复常见的JSON格式问题
        try {
          // 如果响应包含错误信息，直接抛出
          if (cleanResponse.includes('API密钥错误') || 
              cleanResponse.includes('API调用频率过高') || 
              cleanResponse.includes('API调用超时') ||
              cleanResponse.includes('AI服务暂时不可用')) {
            throw new Error(cleanResponse);
          }
          
          const explanations = JSON.parse(cleanResponse);
          
          if (Array.isArray(explanations) && explanations.length === batch.length) {
            batch.forEach((sentence, index) => {
              const exp = explanations[index];
              // 简化的默认值处理
              sentence.explanation = {
                meaning: exp.meaning || `This sentence means: ${sentence.text}`
              };
            });
            console.log(`[批量解释] 批次 ${batchIndex + 1}/${totalBatches} 完成`);
            success = true;
            
            const currentProgress = startPercentage + (batchIndex / totalBatches) * (endPercentage - startPercentage);
            sendProgressToClient(clientId, { 
              type: 'progress', 
              stage: `📚 正在生成句子解释... (${batchIndex + 1}/${totalBatches} 批次)`, 
              percentage: Math.min(endPercentage, Math.round(currentProgress)) 
            });

          } else {
            throw new Error(`返回格式不匹配: 期望${batch.length}个解释，实际${explanations ? explanations.length : 0}个`);
          }
        } catch (parseError) {
          console.log(`[批量解释] JSON解析失败，尝试修复:`, parseError.message);
          console.log(`[批量解释] 原始响应:`, cleanResponse.substring(0, 300));
          
          // 尝试提取JSON数组
          const jsonMatch = cleanResponse.match(/\[.*?\]/s);
          if (jsonMatch && retryCount === maxRetries) {
            try {
              const explanations = JSON.parse(jsonMatch[0]);
              if (Array.isArray(explanations) && explanations.length === batch.length) {
                batch.forEach((sentence, index) => {
                  const exp = explanations[index];
                  sentence.explanation = {
                    meaning: exp.meaning || exp.explanation || `This sentence means: ${sentence.text}`,
                    grammar: exp.grammar || exp.grammarPoint || 'General grammar structure',
                    vocabulary: exp.vocabulary || exp.keyWords || 'Key vocabulary',
                    usage: exp.usage || exp.context || 'Common usage pattern',
                    tip: exp.tip || exp.learningTip || `Tip for ${englishLevel} learners`
                  };
                });
                console.log(`[批量解释] 修复后批次 ${batchIndex + 1}/${totalBatches} 完成`);
                success = true;
              } else {
                throw new Error('修复后格式仍不匹配');
              }
            } catch (fixError) {
              console.log(`[批量解释] 修复尝试失败:`, fixError.message);
              throw parseError; // 重新抛出原始错误
            }
          } else {
            throw parseError;
          }
        }
        
      } catch (error) {
        retryCount++;
        console.log(`[批量解释] 批次 ${batchIndex + 1} 第${retryCount}次失败:`, error.message);
        
        if (retryCount > maxRetries) {
          console.log(`[批量解释] 批次 ${batchIndex + 1} 所有重试都失败，使用默认解释`);
          sendProgressToClient(clientId, { 
            type: 'progress', 
            stage: `⚠️ 句子解释失败，使用默认解释... (${batchIndex + 1}/${totalBatches} 批次)`, 
            percentage: Math.min(endPercentage, Math.round(startPercentage + (batchIndex / totalBatches) * (endPercentage - startPercentage))) 
          });
          
          // 回退到简单解释
          batch.forEach(sentence => {
            sentence.explanation = {
              meaning: `This sentence means: ${sentence.text}`
            };
          });
          success = true; // 标记为成功，继续下一批
        } else {
          // 等待更长时间后重试
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }
    }
    
    // 批次间延迟，避免API限流
    if (batchIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 解析SRT文件
function parseSRT(content) {
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
    
    console.log(`[SRT解析] 成功解析 ${subtitles.length} 条字幕`);
    return subtitles;
  } catch (error) {
    console.error('[SRT解析] 错误:', error);
    throw new Error('SRT文件格式错误');
  }
}

// 解析TXT文件
function parseTXT(content) {
  try {
    // 改进的句子分割算法
    const sentences = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split(/[.!?]+\s*\n|\n\s*\n/)
      .filter(s => s.trim())
      .map(s => s.replace(/\n/g, ' ').trim())
      .filter(s => s.length > 10); // 过滤太短的句子
    
    const result = sentences.map((text, i) => ({ 
      id: i + 1, 
      text: text.charAt(0).toUpperCase() + text.slice(1) // 确保首字母大写
    }));
    
    console.log(`[TXT解析] 成功解析 ${result.length} 个句子`);
    return result;
  } catch (error) {
    console.error('[TXT解析] 错误:', error);
    throw new Error('TXT文件格式错误');
  }
}

// 基于语义的段落划分
async function groupIntoParagraphs(sentences) {
  console.log('[AI处理] 开始基于语义的段落划分...');
  
  try {
    // 使用AI进行语义段落划分
    const divisionPrompt = aiPrompts.generateParagraphDivisionPrompt(sentences);
    const response = await callDeepSeekAPI(divisionPrompt, '');
    
    // 改进JSON解析
    let cleanResponse = response.replace(/```json|```/g, '').trim();
    
    // 尝试修复常见的JSON格式问题
    try {
      const paragraphGroups = JSON.parse(cleanResponse);
      
      if (!Array.isArray(paragraphGroups)) {
        throw new Error('返回格式不是数组');
      }
      
      const paragraphs = [];
      paragraphGroups.forEach((group, index) => {
        if (Array.isArray(group) && group.length > 0) {
          const paragraphSentences = group.map(sentenceIndex => sentences[sentenceIndex]).filter(s => s && s.text);
          if (paragraphSentences.length > 0) {
            paragraphs.push({
              id: index + 1,
              sentences: paragraphSentences,
              title: ''
            });
          }
        }
      });
      
      if (paragraphs.length > 0) {
        console.log(`[语义分段] 成功划分为 ${paragraphs.length} 个段落`);
        return paragraphs;
      } else {
        throw new Error('段落数组为空');
      }
      
    } catch (parseError) {
      console.log('[语义分段] JSON解析失败，尝试修复格式:', parseError.message);
      console.log('[语义分段] 原始响应:', cleanResponse.substring(0, 200));
      
      // 尝试提取JSON数组
      const jsonMatch = cleanResponse.match(/\[\[.*?\]\]/s);
      if (jsonMatch) {
        try {
          const paragraphGroups = JSON.parse(jsonMatch[0]);
          const paragraphs = [];
          paragraphGroups.forEach((group, index) => {
            if (Array.isArray(group) && group.length > 0) {
              const paragraphSentences = group.map(sentenceIndex => sentences[sentenceIndex]).filter(s => s && s.text);
              if (paragraphSentences.length > 0) {
                paragraphs.push({
                  id: index + 1,
                  sentences: paragraphSentences,
                  title: ''
                });
              }
            }
          });
          
          if (paragraphs.length > 0) {
            console.log(`[语义分段] 修复后成功划分为 ${paragraphs.length} 个段落`);
            return paragraphs;
          }
        } catch (fixError) {
          console.log('[语义分段] 修复尝试失败:', fixError.message);
        }
      }
      
      throw new Error('无法解析AI返回的段落划分结果');
    }
    
  } catch (error) {
    console.log('[语义分段] AI划分失败，使用默认分组:', error.message);
    // 回退到原来的简单分组逻辑
    const paragraphs = [];
    const perParagraph = Math.min(8, Math.max(4, Math.ceil(sentences.length / 4))); // 调整为更大的段落，最少4个句子
    
    for (let i = 0; i < sentences.length; i += perParagraph) {
      const paragraphSentences = sentences.slice(i, i + perParagraph).filter(s => s && s.text);
      if (paragraphSentences.length > 0) {
        paragraphs.push({
          id: Math.floor(i / perParagraph) + 1,
          sentences: paragraphSentences,
          title: ''
        });
      }
    }
    
    console.log(`[默认分段] 共分为 ${paragraphs.length} 个段落，每段约 ${perParagraph} 个句子`);
    return paragraphs;
  }
}

// 测试路由
app.get('/', (req, res) => {
  console.log('收到GET请求');
  res.json({ 
    message: '语言学习助手服务器运行正常!', 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// 文件上传处理路由 - 优化版本
app.post('/api/upload', upload.single('file'), async (req, res) => {
  // 从请求体中获取 clientId
  const { englishLevel, clientId } = req.body; // 注意：确保前端在 formData 中发送 clientId
  const file = req.file;

  try {
    if (!clientId) {
      console.error('[Upload] 未收到 clientId，无法推送进度');
      return res.status(400).json({ error: '缺少客户端ID' });
    }

    console.log(`[上传] 收到文件: ${file?.originalname}, 英语水平: ${englishLevel}, 客户端ID: ${clientId}`);

    if (!file) {
      sendProgressToClient(clientId, { type: 'error', message: '请上传文件' });
      return res.status(400).json({ error: '请上传文件' });
    }

    if (!englishLevel) {
      sendProgressToClient(clientId, { type: 'error', message: '请选择英语水平' });
      return res.status(400).json({ error: '请选择英语水平' });
    }

    // 验证英语水平
    const validLevels = ['CET-4', 'CET-6', 'IELTS', 'TOEFL'];
    if (!validLevels.includes(englishLevel)) {
      sendProgressToClient(clientId, { type: 'error', message: '无效的英语水平' });
      return res.status(400).json({ error: '无效的英语水平' });
    }

    sendProgressToClient(clientId, { type: 'progress', stage: '📤 正在上传和解析文件...', percentage: 10 });

    // 读取文件内容
    const content = fs.readFileSync(file.path, 'utf-8');
    const ext = path.extname(file.originalname).toLowerCase();

    let sentences = [];

    if (ext === '.srt') {
      const subtitles = parseSRT(content);
      sentences = subtitles.map(s => ({ id: s.id, text: s.text.replace(/\s+/g, ' ').trim() }));
    } else if (ext === '.txt') {
      sentences = parseTXT(content);
    } else {
      sendProgressToClient(clientId, { type: 'error', message: '只支持.txt和.srt文件' });
      return res.status(400).json({ error: '只支持.txt和.srt文件' });
    }

    if (sentences.length === 0) {
      sendProgressToClient(clientId, { type: 'error', message: '文件内容为空或格式不正确' });
      return res.status(400).json({ error: '文件内容为空或格式不正确' });
    }

    console.log(`[解析] 完成，共${sentences.length}个句子`);
    sendProgressToClient(clientId, { type: 'progress', stage: '✅ 文件解析完成，开始智能分析...', percentage: 20 });

    // 基于语义的段落划分
    sendProgressToClient(clientId, { type: 'progress', stage: '🔍 正在分析语义段落...', percentage: 18 });
    const paragraphs = await groupIntoParagraphs(sentences);

    // 记录开始时间
    const startTime = Date.now();

    // 上下文感知的段落标题生成 (版本3优化)
    sendProgressToClient(clientId, { type: 'progress', stage: '🤖 AI正在分析内容类型...', percentage: 25 });
    await batchProcessTitles(paragraphs, englishLevel, clientId); // 传入英语水平
    sendProgressToClient(clientId, { type: 'progress', stage: '📚 正在生成句子解释...', percentage: 35 });

    // 批量生成句子解释 (优化)
    const allSentences = paragraphs
      .filter(p => p && p.sentences && Array.isArray(p.sentences))
      .flatMap(p => p.sentences)
      .filter(s => s && s.text && s.text.trim().length > 0);
    await batchProcessExplanations(allSentences, englishLevel, clientId); // 传递 clientId

    // 精准词汇分析 (版本2优化)
    console.log('[AI处理] 开始精准词汇分析...');
    sendProgressToClient(clientId, { type: 'progress', stage: '🎯 正在分析重点词汇...', percentage: 85 });
    const allText = sentences.map(s => s.text).join(' ');
    let vocabularyAnalysis = [];

    try {
      // 使用配置化的提示词
      const vocabPrompt = aiPrompts.generateVocabularyPrompt(englishLevel, allText);

      const vocabResponse = await callDeepSeekAPI(vocabPrompt, '');
      const cleanResponse = vocabResponse.replace(/```json|```/g, '').trim();
      vocabularyAnalysis = JSON.parse(cleanResponse);

      if (!Array.isArray(vocabularyAnalysis)) {
        throw new Error('返回格式不是数组');
      }

      vocabularyAnalysis = vocabularyAnalysis.filter(vocab =>
        vocab.term && vocab.explanation && vocab.usage && vocab.examples
      ); // 移除数量限制，保留所有有效词汇

      console.log(`[词汇] 精准分析完成，识别 ${vocabularyAnalysis.length} 个重点词汇`);
      sendProgressToClient(clientId, { type: 'progress', stage: '✨ 重点词汇分析完成...', percentage: 95 });
    } catch (error) {
      console.log('[词汇] 精准分析失败，使用默认词汇:', error.message);
      sendProgressToClient(clientId, { type: 'progress', stage: '⚠️ 词汇分析失败，使用默认词汇...', percentage: 90 });
      vocabularyAnalysis = [
        {
          term: "learning",
          explanation: "Getting knowledge or skills",
          usage: "Used to describe education",
          examples: ["Learning English is fun", "I enjoy learning"]
        },
        {
          term: "example",
          explanation: "A sample to show something",
          usage: "Used to demonstrate a point",
          examples: ["For example, this works", "Give me an example"]
        }
      ];
    }

    // 语法分析和学习建议功能已移除，简化处理流程
    console.log('[处理] 跳过语法分析和学习建议生成...');
    sendProgressToClient(clientId, { type: 'progress', stage: '✅ 词汇分析完成，处理即将完成...', percentage: 95 });

    // 计算处理时间
    const processingTime = Date.now() - startTime;
    console.log(`[性能] 总处理时间: ${processingTime}ms`);

    // 清理临时文件
    try {
      fs.unlinkSync(file.path);
      console.log('[清理] 临时文件已删除');
    } catch (cleanupError) {
      console.warn('[清理] 删除临时文件失败:', cleanupError.message);
    }

    // 返回结果
    const responseData = {
      paragraphs,
      vocabularyAnalysis,
      englishLevel,
      totalSentences: sentences.length,
      totalParagraphs: paragraphs.length,
      processingTime: processingTime
    };

    // 在发送HTTP响应前，通过WebSocket发送最终完成状态
    sendProgressToClient(clientId, { type: 'progress', stage: '🎉 处理完成，正在返回结果...', percentage: 100 });
    sendProgressToClient(clientId, { type: 'completed', data: responseData }); // 发送完整数据，前端接收后可直接渲染

    res.json({
      success: true,
      message: '处理完成，请查看WebSocket获取最终数据', // 修改HTTP响应，提示前端通过WebSocket获取数据
      clientId: clientId // 返回 clientId，确保前端知道是哪个任务的完成
    });

    console.log(`[完成] 文件处理成功，用时${processingTime}ms，共${sentences.length}句子，${paragraphs.length}段落，${vocabularyAnalysis.length}词汇`);

  } catch (error) {
    console.error('[错误] 处理失败:', error);

    // 清理临时文件
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('[清理] 删除临时文件失败:', cleanupError.message);
      }
    }

    // 通过WebSocket发送错误信息
    sendProgressToClient(clientId, { type: 'error', message: error.message || '服务器内部错误' });

    res.status(500).json({
      error: error.message || '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('[全局错误]:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过5MB限制' });
    }
  }
  
  res.status(500).json({ 
    error: '服务器内部错误',
    timestamp: new Date().toISOString()
  });
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已安全关闭');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
}); 