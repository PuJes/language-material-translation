const tcb = require('@cloudbase/node-sdk');
const axios = require('axios');

// 全局变量，避免重复初始化
let app;
let db;
let storage;

/**
 * AI处理云函数
 * 功能：从云存储读取文件，调用DeepSeek API处理，生成HTML学习材料
 */
exports.main = async (event, context) => {
  const { taskId, fileId, englishLevel } = event;
  
  try {
    // 初始化CloudBase SDK
    if (!app) {
      app = tcb.init({
        env: context.TCB_ENV
      });
      db = app.database();
      storage = app.storage();
    }

    console.log(`[${taskId}] 开始AI处理任务`);

    // 更新任务状态为处理中
    await db.collection('tasks').doc(taskId).update({
      status: 'processing',
      progress: 10,
      startedAt: new Date(),
      updatedAt: new Date()
    });

    // 从云存储下载文件
    console.log(`[${taskId}] 下载文件: ${fileId}`);
    const downloadResult = await storage.downloadFile({
      fileID: fileId
    });

    const fileContent = downloadResult.fileContent.toString('utf-8');
    console.log(`[${taskId}] 文件内容长度: ${fileContent.length} 字符`);

    // 更新进度
    await updateProgress(taskId, 30, '文件读取完成，开始AI分析...');

    // 解析文件内容
    const sentences = parseFileContent(fileContent);
    console.log(`[${taskId}] 解析出 ${sentences.length} 个句子`);

    // 更新进度
    await updateProgress(taskId, 50, 'AI分析中...');

    // 调用AI服务处理
    const processedContent = await processWithAI(sentences, englishLevel, taskId);

    // 更新进度
    await updateProgress(taskId, 80, '生成学习材料...');

    // 生成HTML学习材料
    const htmlContent = generateHTML(processedContent, englishLevel);

    // 保存结果到云存储
    const resultPath = `results/${taskId}/learning-material.html`;
    const uploadResult = await storage.uploadFile({
      cloudPath: resultPath,
      fileContent: Buffer.from(htmlContent, 'utf-8')
    });

    console.log(`[${taskId}] 结果文件保存成功: ${uploadResult.fileID}`);

    // 更新任务状态为完成
    await db.collection('tasks').doc(taskId).update({
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      updatedAt: new Date(),
      resultFileId: uploadResult.fileID,
      resultPath: resultPath,
      message: '处理完成'
    });

    console.log(`[${taskId}] AI处理任务完成`);

    return {
      success: true,
      taskId: taskId,
      status: 'completed',
      resultFileId: uploadResult.fileID
    };

  } catch (error) {
    console.error(`[${taskId}] AI处理失败:`, error);

    // 更新任务状态为失败
    await db.collection('tasks').doc(taskId).update({
      status: 'failed',
      errorMessage: error.message,
      updatedAt: new Date()
    });

    return {
      success: false,
      taskId: taskId,
      status: 'failed',
      error: error.message
    };
  }
};

/**
 * 更新任务进度
 */
async function updateProgress(taskId, progress, message) {
  try {
    await db.collection('tasks').doc(taskId).update({
      progress: progress,
      message: message,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error(`[${taskId}] 更新进度失败:`, error);
  }
}

/**
 * 解析文件内容
 */
function parseFileContent(content) {
  // 简单的句子分割逻辑
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 500) // 过滤过长或过短的句子
    .slice(0, 50); // 限制最多50个句子

  return sentences;
}

/**
 * 调用AI服务处理
 */
async function processWithAI(sentences, englishLevel, taskId) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 环境变量未配置');
  }

  const processedSentences = [];
  const batchSize = 5; // 每批处理5个句子

  for (let i = 0; i < sentences.length; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);
    console.log(`[${taskId}] 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(sentences.length/batchSize)}`);

    try {
      const prompt = createPrompt(batch, englishLevel);
      
      const response = await axios.post('https://api.deepseek.com/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      const aiResult = response.data.choices[0].message.content;
      const parsedResult = parseAIResponse(aiResult, batch);
      processedSentences.push(...parsedResult);

      // 更新进度
      const progress = 50 + Math.floor((i + batchSize) / sentences.length * 30);
      await updateProgress(taskId, progress, `AI分析中... (${i + batchSize}/${sentences.length})`);

      // 避免API限流
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`[${taskId}] AI处理批次失败:`, error);
      // 对失败的句子使用默认处理
      batch.forEach(sentence => {
        processedSentences.push({
          original: sentence,
          explanation: '处理失败，请稍后重试',
          keywords: [],
          difficulty: 'unknown'
        });
      });
    }
  }

  return processedSentences;
}

/**
 * 创建AI提示词
 */
function createPrompt(sentences, englishLevel) {
  const levelMap = {
    'CET-4': '英语四级',
    'CET-6': '英语六级', 
    'IELTS': '雅思',
    'TOEFL': '托福'
  };

  const level = levelMap[englishLevel] || '中级';

  return `请分析以下英语句子，为${level}水平的学习者提供详细解释。对每个句子，请提供：
1. 句子的中文翻译
2. 语法结构分析
3. 重点词汇解释
4. 难度评级（easy/medium/hard）

句子列表：
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

请以JSON格式返回结果，格式如下：
[
  {
    "original": "原句",
    "translation": "中文翻译",
    "grammar": "语法分析",
    "keywords": ["重点词汇1", "重点词汇2"],
    "difficulty": "easy/medium/hard"
  }
]`;
}

/**
 * 解析AI响应
 */
function parseAIResponse(aiResult, originalSentences) {
  try {
    // 尝试解析JSON
    const jsonMatch = aiResult.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch (error) {
    console.error('解析AI响应失败:', error);
  }

  // 如果解析失败，返回默认结果
  return originalSentences.map(sentence => ({
    original: sentence,
    translation: '翻译处理中...',
    grammar: '语法分析处理中...',
    keywords: [],
    difficulty: 'medium'
  }));
}

/**
 * 生成HTML学习材料
 */
function generateHTML(processedContent, englishLevel) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>英语学习材料 - ${englishLevel}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .sentence-item {
            margin-bottom: 25px;
            padding: 20px;
            border-left: 4px solid #4CAF50;
            background-color: #f9f9f9;
            border-radius: 5px;
        }
        .original {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .translation {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
        }
        .grammar {
            font-size: 14px;
            color: #888;
            margin-bottom: 10px;
            font-style: italic;
        }
        .keywords {
            margin-top: 10px;
        }
        .keyword {
            display: inline-block;
            background-color: #2196F3;
            color: white;
            padding: 3px 8px;
            margin: 2px;
            border-radius: 3px;
            font-size: 12px;
        }
        .difficulty {
            float: right;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: bold;
        }
        .difficulty.easy { background-color: #4CAF50; color: white; }
        .difficulty.medium { background-color: #FF9800; color: white; }
        .difficulty.hard { background-color: #F44336; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>英语学习材料</h1>
            <p>学习水平: ${englishLevel} | 生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
        
        ${processedContent.map((item, index) => `
        <div class="sentence-item">
            <div class="difficulty ${item.difficulty}">${item.difficulty.toUpperCase()}</div>
            <div class="original">${index + 1}. ${item.original}</div>
            <div class="translation">翻译: ${item.translation || '暂无翻译'}</div>
            <div class="grammar">语法: ${item.grammar || '暂无语法分析'}</div>
            <div class="keywords">
                重点词汇: 
                ${(item.keywords || []).map(keyword => 
                  `<span class="keyword">${keyword}</span>`
                ).join('')}
            </div>
        </div>
        `).join('')}
        
        <div style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
            <p>由智能语言学习助手生成 | 共 ${processedContent.length} 个句子</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}