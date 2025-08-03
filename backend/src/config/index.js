/**
 * 应用配置文件
 * 集中管理所有配置项，便于维护和部署
 */

require('dotenv').config();

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0', // 修改为0.0.0.0以支持云部署
    env: process.env.NODE_ENV || 'development'
  },

  // CORS配置
  cors: {
    origins: (() => {
      const baseOrigins = [
        'http://localhost:3000',
        'http://localhost:5173'
      ];
      
      // 在生产环境中添加CloudBase和其他部署URL
      if (process.env.NODE_ENV === 'production') {
        // CloudBase前端URL
        if (process.env.CLOUDBASE_ENV_ID) {
          baseOrigins.push(`https://${process.env.CLOUDBASE_ENV_ID}.tcloudbaseapp.com`);
          baseOrigins.push(`https://${process.env.CLOUDBASE_ENV_ID}.ap-shanghai.tcb.qcloud.la`);
        }
        
        // Render前端URL（向后兼容）
        baseOrigins.push('https://language-learning-frontend.onrender.com');
      }
      
      // 支持自定义前端URL环境变量
      if (process.env.FRONTEND_URL) {
        baseOrigins.push(process.env.FRONTEND_URL);
      }
      
      // 支持CORS_ORIGINS环境变量（多个域名用逗号分隔）
      if (process.env.CORS_ORIGINS) {
        const customOrigins = process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
        baseOrigins.push(...customOrigins);
      }
      
      return baseOrigins;
    })(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // 支持旧版浏览器
  },

  // 文件上传配置
  upload: {
    maxFileSize: 150 * 1024, // 150KB
    allowedTypes: ['.txt', '.srt'],
    uploadDir: './uploads'
  },

  // CloudBase存储配置
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local' 或 'cloudbase'
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    cloudbase: {
      envId: process.env.CLOUDBASE_ENV_ID,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
      bucket: process.env.CLOUDBASE_BUCKET || 'language-learning-files',
      region: process.env.CLOUDBASE_REGION || 'ap-shanghai'
    }
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
      baseTimeout: 300000, // 基础超时5分钟
      perCharacterTimeout: 0.1, // 每字符增加0.1毫秒
      maxTimeout: 600000, // 最大超时10分钟
      minTimeout: 120000 // 最小超时2分钟
    },
    // 新增：智能重试配置
    smartRetry: {
      enabled: true, // 启用智能重试
      exponentialBackoff: true, // 指数退避
      maxBackoffDelay: 30000, // 最大退避延迟30秒
      jitter: true // 添加随机抖动
    }
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