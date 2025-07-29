/**
 * 应用配置文件
 * 集中管理所有配置项，便于维护和部署
 */

require('dotenv').config();

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // CORS配置
  cors: {
    origins: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  },

  // 文件上传配置
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['.txt', '.srt'],
    uploadDir: './uploads'
  },

  // AI API配置
  ai: {
    apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-chat',
    maxTokens: 2000,
    temperature: 0.3,
    timeout: 120000, // 增加到120秒，适应大文件处理
    retries: 3, // 增加重试次数到3次
    keepAlive: true, // 启用连接保持
    // 新增：动态超时配置
    dynamicTimeout: {
      enabled: true, // 启用动态超时
      baseTimeout: 60000, // 基础超时60秒
      perCharacterTimeout: 0.1, // 每字符增加0.1毫秒
      maxTimeout: 300000, // 最大超时5分钟
      minTimeout: 30000 // 最小超时30秒
    },
    // 新增：智能重试配置
    smartRetry: {
      enabled: true, // 启用智能重试
      exponentialBackoff: true, // 指数退避
      maxBackoffDelay: 30000, // 最大退避延迟30秒
      jitter: true // 添加随机抖动
    }
  },

  // WebSocket配置
  websocket: {
    heartbeatInterval: 30000, // 30秒心跳
    maxReconnectAttempts: 5,
    reconnectDelay: 2000
  },

  // 处理配置
  processing: {
    batchSize: 5, // 每批处理句子数
    batchDelay: 500, // 批次间延迟(ms)
    maxParagraphs: 10 // 最大段落数
  },

  // 英语水平配置
  englishLevels: {
    'CET-4': {
      name: '英语四级',
      description: '基础词汇与语法',
      vocabulary: ['important', 'different', 'understand', 'experience', 'develop', 'education', 'society', 'culture']
    },
    'CET-6': {
      name: '英语六级', 
      description: '进阶词汇与表达',
      vocabulary: ['comprehensive', 'significant', 'demonstrate', 'establish', 'fundamental', 'particular', 'professional', 'analysis']
    },
    'IELTS': {
      name: '雅思',
      description: '国际英语水平',
      vocabulary: ['substantial', 'moreover', 'furthermore', 'consequently', 'nevertheless', 'significance', 'implementation', 'methodology']
    },
    'TOEFL': {
      name: '托福',
      description: '学术英语能力',
      vocabulary: ['sophisticated', 'phenomenon', 'paradigm', 'hypothesis', 'predominantly', 'comprehensive', 'substantial', 'methodology']
    }
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: './logs',
    maxSize: '10m',
    maxFiles: '5'
  }
};

module.exports = config; 