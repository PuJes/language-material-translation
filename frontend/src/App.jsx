import React, { useState } from 'react';
import { Layout, Upload, Button, Select, message, Spin, Card, Typography, Row, Col, Space, Progress, Dropdown } from 'antd';
import { UploadOutlined, DownloadOutlined, BookOutlined, RocketOutlined, FileTextOutlined, GlobalOutlined, ClockCircleOutlined, ThunderboltOutlined, FilePdfOutlined, FileExclamationOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl, API_CONFIG } from './config/api.js';
import ErrorPage from './components/ErrorPage.jsx';
import './App.css';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;


/**
 * 主应用组件
 * 功能：文件上传、英语水平选择、材料处理、结果展示、HTML下载
 */
function App() {
  // 状态管理
  const [fileList, setFileList] = useState([]);
  const [englishLevel, setEnglishLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [selectedVocabulary, setSelectedVocabulary] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);
  

  
  // 进度相关状态
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // 错误状态管理
  const [errorState, setErrorState] = useState(null); // 错误状态信息
  // 移除 timeoutWarning 状态
  // const [timeoutWarning, setTimeoutWarning] = useState(false);


  // 网络连接检查函数
  const checkNetworkConnectivity = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(getApiUrl('/api/health'), {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('[App] Network connectivity check failed:', error.message);
      return false;
    }
  };

  // 构建错误状态对象
  const buildErrorState = async (error) => {
    const networkStatus = await checkNetworkConnectivity();
    
    let errorType = 'UNKNOWN_ERROR';
    let errorMessage = '文件处理失败';
    let statusCode = null;
    let errorCode = null;
    let suggestions = null;

    if (error.response) {
      // 服务器响应错误
      statusCode = error.response.status;
      const serverError = error.response.data?.error || error.response.statusText;
      errorCode = error.response.data?.code || `HTTP_${statusCode}`;
      
      if (statusCode === 413) {
        errorType = 'FILE_ERROR';
        errorMessage = '文件过大，请选择小于5MB的文件';
        suggestions = [
          '选择更小的文件（建议小于1MB）',
          '将长文本分割成多个较短的文件',
          '压缩文件内容或删除不必要的部分'
        ];
      } else if (statusCode === 415) {
        errorType = 'FILE_ERROR';
        errorMessage = '不支持的文件格式，请上传 .txt 或 .srt 文件';
        suggestions = [
          '确保文件扩展名为 .txt 或 .srt',
          '检查文件是否为纯文本格式',
          '尝试重新保存文件为UTF-8编码'
        ];
      } else if (statusCode === 429) {
        errorType = 'SERVER_ERROR';
        errorMessage = '请求过于频繁，请稍后再试';
        suggestions = [
          '等待几分钟后重试',
          '避免频繁上传文件',
          '检查是否有其他标签页在同时使用服务'
        ];
      } else if (statusCode >= 500) {
        errorType = 'SERVER_ERROR';
        errorMessage = `服务器暂时不可用 (${statusCode})，请稍后重试`;
        suggestions = [
          '服务器正在维护，请稍后重试',
          '检查服务状态页面了解更多信息',
          '如果问题持续存在，请联系技术支持'
        ];
      } else if (statusCode === 401) {
        errorType = 'AUTHENTICATION_ERROR';
        errorMessage = 'API密钥无效或已过期';
        errorCode = 'AUTHENTICATION_FAILED';
        suggestions = [
          '请联系管理员检查API密钥配置',
          '确认API密钥是否已过期',
          '检查API服务是否正常运行',
          '如果问题持续存在，请联系技术支持'
        ];
      } else if (statusCode === 400) {
        errorType = 'VALIDATION_ERROR';
        errorMessage = `请求格式错误：${serverError}`;
        suggestions = [
          '检查上传的文件是否完整',
          '确保选择了正确的英语水平',
          '尝试重新上传文件'
        ];
      } else if (statusCode === 503) {
        errorType = 'SERVICE_ERROR';
        errorMessage = 'AI服务暂时不可用';
        errorCode = 'SERVICE_UNAVAILABLE';
        suggestions = [
          'AI服务正在维护或过载',
          '请稍后重试',
          '如果问题持续存在，请联系技术支持'
        ];
      } else if (statusCode === 504) {
        errorType = 'TIMEOUT_ERROR';
        errorMessage = '服务响应超时';
        errorCode = 'GATEWAY_TIMEOUT';
        suggestions = [
          '服务器响应时间过长',
          '尝试上传更小的文件',
          '稍后重试',
          '检查网络连接状态'
        ];
      } else {
        errorType = 'SERVER_ERROR';
        errorMessage = `请求失败 (${statusCode})：${serverError}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT_ERROR';
      errorMessage = '请求超时，文件可能过大或网络较慢';
      errorCode = 'TIMEOUT';
      suggestions = [
        '尝试上传更小的文件',
        '检查网络连接速度',
        '稍后再试，避开网络高峰期',
        '将长文本分割成多个较短的文件'
      ];
    } else if (error.code === 'ERR_NETWORK') {
      errorType = 'NETWORK_ERROR';
      errorMessage = '网络连接失败，请检查网络设置';
      errorCode = 'NETWORK_FAILED';
      suggestions = [
        '检查网络连接是否正常',
        '尝试刷新页面后重新操作',
        '如果使用VPN，请尝试关闭后重试',
        '检查防火墙设置是否阻止了连接'
      ];
    } else if (error.code === 'ERR_CONNECTION_REFUSED') {
      errorType = 'NETWORK_ERROR';
      errorMessage = '无法连接到服务器，服务可能暂时不可用';
      errorCode = 'CONNECTION_REFUSED';
      suggestions = [
        '服务器可能正在维护',
        '检查网络连接是否正常',
        '稍后重试',
        '联系技术支持了解服务状态'
      ];
    } else if (error.name === 'AbortError') {
      errorType = 'NETWORK_ERROR';
      errorMessage = '请求被中断，请重试';
      errorCode = 'REQUEST_ABORTED';
    } else {
      errorType = 'UNKNOWN_ERROR';
      errorMessage = `网络错误：${error.message || '未知错误'}`;
      errorCode = 'UNKNOWN';
    }

    return {
      type: errorType,
      message: errorMessage,
      code: errorCode,
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      retryCount: 0, // 不再使用自动重试
      networkStatus: networkStatus ? 'connected' : 'disconnected',
      suggestions: suggestions,
      originalError: error.message
    };
  };


  // 英语水平选项配置
  const levelOptions = [
    { value: 'CET-4', label: '🎯 英语四级 (CET-4)', description: '基础词汇与语法' },
    { value: 'CET-6', label: '🚀 英语六级 (CET-6)', description: '进阶词汇与表达' },
    { value: 'IELTS', label: '🌍 雅思 (IELTS)', description: '国际英语水平' },
    { value: 'TOEFL', label: '🎓 托福 (TOEFL)', description: '学术英语能力' }
  ];

  /**
   * 文件上传配置
   */
  const uploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.txt,.srt',
    fileList,
    beforeUpload: (file) => {
      const allowedTypes = ['txt', 'srt'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        message.error('只支持 .txt 和 .srt 格式的文件！');
        return false;
      }
      
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('文件大小不能超过 5MB！');
        return false;
      }
      
      // 根据测试结果给出文件大小警告
      const fileSize = file.size;
      if (fileSize > 200) {
        if (fileSize > 1000) {
          message.warning(`文件较大 (${(fileSize/1024).toFixed(2)}KB)，根据测试可能会超时失败。建议使用更小的文件 (<200字节)。`);
        } else {
          message.info(`文件大小 (${(fileSize/1024).toFixed(2)}KB) 可能需要较长处理时间 (40-60秒)，请耐心等待。`);
        }
      } else {
        message.success(`文件大小适中 (${fileSize}字节)，预计处理时间 40-50秒。`);
      }
      
      setFileList([file]);
      return false; // 阻止 Ant Design 自动上传
    },
    onRemove: () => {
      setFileList([]);
    }
  };



  /**
   * 开始处理文件
   */
  const handleProcess = async () => {
    if (fileList.length === 0) {
      message.error('请先上传文件！');
      return;
    }
    
    if (!englishLevel) {
      message.error('请选择英语水平！');
      return;
    }

    // 重置所有状态，开始加载
    setLoading(true);
    setResult(null);
    setProcessingTime(null);
    setProcessingStage('正在准备上传...');
    setProcessingProgress(0);
    console.log('State before HTTP request:', { loading, result, processingStage, processingProgress });
    
    // 显示模拟进度
    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += Math.random() * 8 + 2; // 每次增加2-10%
      if (progressValue >= 85) {
        progressValue = 85; // 停在85%等待实际结果
      }
      setProcessingProgress(progressValue);
      
      // 更新处理阶段信息
      if (progressValue < 30) {
        setProcessingStage('正在分析文件结构...');
      } else if (progressValue < 60) {
        setProcessingStage('正在处理文本内容...');
      } else if (progressValue < 85) {
        setProcessingStage('正在生成学习材料...');
      }
    }, 1500);
    
    // 清理定时器的函数
    const clearProgressInterval = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
    
    try {
      const formData = new FormData();
      formData.append('file', fileList[0]);
      formData.append('englishLevel', englishLevel);

      console.log('开始上传文件并处理...');
      
      const apiUrl = getApiUrl('/api/upload');
      console.log('[HTTP] Uploading to:', apiUrl);
      
      // 直接进行API调用（不使用重试机制）
      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.timeout,
      });
      
      clearProgressInterval();
      
      // HTTP 响应包含完整结果
      // 兼容两种响应格式：直接格式和标准包装格式
      const responseResult = response.data.result || response.data.data?.result;
      const responseProcessingTime = response.data.processingTime || response.data.data?.processingTime;
      
      if (responseResult) {
        setResult(responseResult);
        setProcessingTime(responseProcessingTime);
        setProcessingProgress(100);
        setProcessingStage('✅ 处理完成！');
        setErrorState(null); // 清除任何之前的错误状态
        
        setTimeout(() => {
          setLoading(false);
          setProcessingStage('');
          message.success({
            content: `✅ 分析完成！用时 ${(responseProcessingTime / 1000).toFixed(1)} 秒`,
            duration: 3
          });
        }, 500);
      } else {
        console.error('响应格式错误:', response.data);
        throw new Error('Invalid response format');
      }

    } catch (error) {
      clearProgressInterval();
      console.error('❌ [HTTP请求] 处理失败:', error);
      
      // 构建详细的错误状态
      const errorStateData = await buildErrorState(error);
      
      // 设置错误状态，显示错误页面
      setErrorState(errorStateData);
      
      // 重置其他状态
      setLoading(false);
      setProcessingStage('');
      setProcessingProgress(0);
      setResult(null);
      
      // 显示简短的错误提示
      message.error({
        content: `处理失败：${errorStateData.message}`,
        duration: 3,
        style: { marginTop: '100px' }
      });
      
      console.log('Error state set:', errorStateData);
    }
  };

  // 在组件渲染前，打印最新的状态值
  console.log('Rendering App with state:', { loading, result, processingStage, processingProgress });


  /**
   * 错误页面重试处理
   */
  const handleErrorRetry = () => {
    console.log('用户点击重试按钮');
    setErrorState(null); // 清除错误状态
    handleProcess(); // 重新处理文件
  };

  /**
   * 错误页面重置处理
   */
  const handleErrorReset = () => {
    console.log('用户点击重新开始按钮');
    // 重置所有状态到初始状态
    setErrorState(null);
    setResult(null);
    setFileList([]);
    setEnglishLevel('');
    setLoading(false);
    setProcessingStage('');
    setProcessingProgress(0);
    setSelectedSentence(null);
    setSelectedVocabulary(null);
    setProcessingTime(null);
    
    message.info('已重置，请重新选择文件和英语水平');
  };

  /**
   * 句子点击处理
   */
  const handleSentenceClick = (sentence) => {
    setSelectedSentence(sentence);
    setSelectedVocabulary(null);
  };

  /**
   * 词汇点击处理
   */
  const handleVocabularyClick = (vocabulary) => {
    setSelectedVocabulary(vocabulary);
    setSelectedSentence(null);
  };

  /**
   * 演示下载功能（使用示例数据）
   */
  const handleDemoDownload = () => {
    console.log('开始演示下载功能...');
    
    // 创建演示数据
    const demoData = {
      englishLevel: 'CET-4',
      totalParagraphs: 3,
      totalSentences: 6,
      paragraphs: [
        {
          id: 1,
          title: "Introduction to English Learning",
          sentences: [
            {
              id: 'sen_1',
              text: "Hello, welcome to our English learning platform.",
              explanation: "This is a greeting sentence that introduces users to the learning platform. It uses simple present tense and common vocabulary."
            },
            {
              id: 'sen_2', 
              text: "We provide comprehensive materials for different levels.",
              explanation: "This sentence explains the service offering. 'Comprehensive' means complete and thorough, and 'levels' refers to different difficulty stages."
            }
          ]
        },
        {
          id: 2,
          title: "Learning Process",
          sentences: [
            {
              id: 'sen_3',
              text: "First, you need to choose your English proficiency level.",
              explanation: "This sentence uses 'First' as a sequence marker. 'Proficiency level' means your skill level in English."
            },
            {
              id: 'sen_4',
              text: "Then, upload your study materials in text or subtitle format.",
              explanation: "This explains the next step. 'Upload' means to transfer files to a system, and 'subtitle format' refers to .srt files."
            }
          ]
        },
        {
          id: 3,
          title: "Download and Study",
          sentences: [
            {
              id: 'sen_5',
              text: "After processing, you can download the enhanced materials.",
              explanation: "This describes the final step. 'Processing' means the system analyzes your files, and 'enhanced' means improved with explanations."
            },
            {
              id: 'sen_6',
              text: "The materials include vocabulary analysis and sentence explanations.",
              explanation: "This sentence lists what's included. 'Vocabulary analysis' means detailed word study, and 'explanations' help you understand meaning."
            }
          ]
        }
      ],
      vocabularyAnalysis: [
        {
          term: "comprehensive",
          explanation: "Including everything; complete and thorough",
          usage: "Used to describe something that covers all aspects",
          examples: [
            "We offer comprehensive health insurance.",
            "The report provides a comprehensive analysis of the market.",
            "She has comprehensive knowledge of the subject."
          ]
        },
        {
          term: "proficiency",
          explanation: "A high degree of skill or competence",
          usage: "Often used with 'level' to describe skill in languages",
          examples: [
            "Her proficiency in Spanish is impressive.",
            "Language proficiency tests are required for admission.",
            "He demonstrated proficiency in computer programming."
          ]
        },
        {
          term: "enhanced",
          explanation: "Improved in quality, value, or attractiveness",
          usage: "Past participle often used as an adjective",
          examples: [
            "The enhanced version includes new features.",
            "Enhanced security measures have been implemented.",
            "Students receive enhanced learning materials."
          ]
        },
        {
          term: "vocabulary", 
          explanation: "The words used in a particular language or subject",
          usage: "Uncountable noun, often used with 'build' or 'expand'",
          examples: [
            "Reading helps expand your vocabulary.",
            "Technical vocabulary can be challenging.",
            "She has an extensive English vocabulary."
          ]
        }
      ]
    };
    
    // 生成并下载HTML文件
    const currentDate = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `英语学习材料-演示版-${currentDate}.html`;
    const htmlContent = generateHTML(demoData);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    message.success({
      content: `🎉 演示版HTML学习材料下载成功！文件名：${fileName}`,
      duration: 4
    });
    
    console.log('演示下载完成');
  };

  /**
   * 生成HTML文件并下载
   */
  const handleDownload = (format = 'html') => {
    
    
    if (!result) {
      console.error('❌ [错误] result数据为空');
      message.error('没有可下载的数据，请先完成分析');
      return;
    }

    try {
      // 生成更有意义的文件名：包含日期和英语水平
      const currentDate = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      
      if (format === 'html') {
        console.log('📥 [下载] 开始生成HTML文件...');
        const fileName = `英语学习材料-${result.englishLevel}-${currentDate}.html`;
        const htmlContent = generateHTML(result);
        console.log('📄 [HTML] 内容生成完成，长度:', htmlContent.length);
        
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('✅ [成功] HTML文件下载触发完成');
        message.success({
          content: `HTML学习材料下载成功！文件名：${fileName}`,
          duration: 3
        });
      } else if (format === 'txt') {
        console.log('📥 [下载] 开始生成TXT文件...');
        const fileName = `英语学习材料-${result.englishLevel}-${currentDate}.txt`;
        const textContent = generateTextContent(result);
        console.log('📄 [TXT] 内容生成完成，长度:', textContent.length);
        
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('✅ [成功] TXT文件下载触发完成');
        message.success({
          content: `文本格式学习材料下载成功！文件名：${fileName}`,
          duration: 3
        });
      }
    } catch (error) {
      console.error('❌ [错误] 下载失败:', error);
      message.error(`下载失败：${error.message}`);
    }
  };

  /**
   * 生成纯文本格式的学习材料
   */
  const generateTextContent = (data) => {
    const { paragraphs, vocabularyAnalysis, englishLevel } = data;
    
    let content = `英语学习材料 - ${englishLevel} 级别\n`;
    content += `生成时间：${new Date().toLocaleString()}\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    // 添加段落内容
    paragraphs.forEach((paragraph, index) => {
      content += `段落 ${paragraph.id}: ${paragraph.title}\n`;
      content += `${'-'.repeat(30)}\n`;
      
      paragraph.sentences.forEach((sentence, sentenceIndex) => {
        content += `${sentenceIndex + 1}. ${sentence.text}\n`;
        content += `   解释：${sentence.explanation}\n\n`;
      });
      
      content += '\n';
    });
    
    // 添加词汇分析
    content += `重点词汇分析 (共 ${vocabularyAnalysis.length} 个)\n`;
    content += `${'='.repeat(30)}\n\n`;
    
    vocabularyAnalysis.forEach((vocab, index) => {
      content += `${index + 1}. ${vocab.term}\n`;
      content += `   解释：${vocab.explanation}\n`;
      content += `   用法：${vocab.usage}\n`;
      content += `   例句：\n`;
      vocab.examples.forEach((example, exampleIndex) => {
        content += `     ${exampleIndex + 1}) ${example}\n`;
      });
      content += '\n';
    });
    
    return content;
  };

  /**
   * 生成完整的HTML学习材料
   */
  const generateHTML = (data) => {
    const { paragraphs, vocabularyAnalysis, englishLevel } = data;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Learning Material - ${englishLevel}</title>
    <style>
        body {
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        .header h1 {
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 2.5rem;
            margin: 0;
            font-weight: 700;
        }
        .level-badge {
            background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 10px;
            font-weight: 600;
        }
        .content-grid {
            display: flex;
            gap: 30px;
            align-items: flex-start;
        }
        .main-content {
            flex: 2;
        }
        .sidebar {
            flex: 1;
            position: sticky;
            top: 20px;
        }
        .paragraph {
            margin-bottom: 30px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            transition: transform 0.3s ease;
        }
        .paragraph:hover {
            transform: translateY(-2px);
        }
        .paragraph-title {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            font-weight: 600;
            font-size: 16px;
        }
        .sentence {
            cursor: pointer;
            padding: 16px 24px;
            transition: all 0.3s ease;
            border-left: 4px solid transparent;
            line-height: 1.6;
        }
        .sentence:hover {
            background: linear-gradient(90deg, #f0f4ff 0%, #e8f2ff 100%);
            border-left: 4px solid #667eea;
            transform: translateX(8px);
        }
        .sentence.selected {
            background: linear-gradient(90deg, #e8f2ff 0%, #d1d9ff 100%);
            border-left: 4px solid #667eea;
            font-weight: 500;
        }
        .vocabulary-word {
            background: linear-gradient(135deg, #fff5e6, #ffe4b5);
            padding: 3px 8px;
            border-radius: 6px;
            cursor: pointer;
            border-bottom: 2px solid #ff9500;
            margin: 0 2px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .vocabulary-word:hover {
            background: linear-gradient(135deg, #ffe4b5, #ffd700);
            transform: translateY(-1px);
        }
        .explanation-panel {
            background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
            border-radius: 12px;
            padding: 20px;
            border: 2px solid #e1e5e9;
        }
        .explanation-title {
            color: #667eea;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 16px;
        }
        /* 返回顶部按钮 */
        .back-to-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
            z-index: 1000;
        }
        .back-to-top:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        }
        
        /* 打印样式 */
        @media print {
            body { background: white !important; }
            .container { box-shadow: none !important; }
            .back-to-top { display: none !important; }
            .sidebar { position: static !important; }
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
            .content-grid {
                flex-direction: column;
            }
            .sentence:hover {
                transform: none;
            }
            .container {
                padding: 15px;
                margin: 10px;
            }
            .back-to-top {
                bottom: 20px;
                right: 20px;
                width: 45px;
                height: 45px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 English Learning Material</h1>
            <div class="level-badge">Level: ${englishLevel}</div>
        </div>
        
        <div class="content-grid">
            <div class="main-content">
                ${paragraphs.map((paragraph, index) => `
                    <div class="paragraph">
                        <div class="paragraph-title">
                            Section ${paragraph.id}: ${paragraph.title}
                        </div>
                        ${paragraph.sentences.map(sentence => `
                            <div class="sentence" onclick="showExplanation('${sentence.id}', '${sentence.text.replace(/'/g, "\\'")}', '${sentence.explanation.replace(/'/g, "\\'")}')">
                                ${highlightVocabulary(sentence.text, vocabularyAnalysis)}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
            
            <div class="sidebar">
                <div id="explanation-area" class="explanation-panel">
                    <div class="explanation-title">📖 点击句子或词汇</div>
                    <p>点击任意句子查看详细解释，或点击高亮词汇了解其用法和例句。</p>
                </div>
            </div>
        </div>
    </div>

    <!-- 返回顶部按钮 -->
    <button class="back-to-top" onclick="scrollToTop()" title="返回顶部">
        ↑
    </button>

    <script>
        let currentSelected = null;
        
        // 将词汇数据存储为JavaScript变量
        const vocabularyData = ${JSON.stringify(vocabularyAnalysis)};
        
        function showExplanation(id, text, explanation) {
            if (currentSelected) {
                currentSelected.classList.remove('selected');
            }
            
            currentSelected = event.target;
            currentSelected.classList.add('selected');
            
            const explanationArea = document.getElementById('explanation-area');
            explanationArea.innerHTML = \`
                <div class="explanation-title">💬 句子解释</div>
                <p><strong>原句:</strong> \${text}</p>
                <p><strong>解释:</strong> \${explanation}</p>
            \`;
        }
        
        function showVocabulary(term, explanation, usage, examples) {
            try {
                
                const explanationArea = document.getElementById('explanation-area');
                if (!explanationArea) {
                    console.error('错误: 找不到explanation-area元素');
                    return;
                }
                
                // 处理例句数组
                let examplesHtml = '';
                if (Array.isArray(examples)) {
                    examplesHtml = examples.map(example => '<li>' + example + '</li>').join('');
                } else {
                    console.warn('警告: examples不是数组，类型为:', typeof examples);
                    examplesHtml = '<li>' + examples + '</li>';
                }
                
                explanationArea.innerHTML = \`
                    <div class="explanation-title">📚 词汇分析</div>
                    <p><strong>词汇:</strong> \${term}</p>
                    <p><strong>解释:</strong> \${explanation}</p>
                    <p><strong>用法:</strong> \${usage}</p>
                    <p><strong>例句:</strong></p>
                    <ul>
                        \${examplesHtml}
                    </ul>
                \`;
                
                // 阻止事件冒泡
                if (typeof event !== 'undefined' && event) {
                    event.stopPropagation();
                }
            } catch (error) {
                console.error('showVocabulary函数出错:', error);
            }
        }

        function showVocabularyById(vocabId) {
            try {
                console.log('词汇点击 (by ID):', vocabId);
                
                const explanationArea = document.getElementById('explanation-area');
                if (!explanationArea) {
                    console.error('错误: 找不到explanation-area元素');
                    return;
                }

                // 从vocabId提取索引
                const index = parseInt(vocabId.replace('vocab_', ''));
                const vocab = vocabularyData[index];
                
                if (!vocab) {
                    console.error('未找到词汇数据:', vocabId, '索引:', index);
                    return;
                }

                console.log('找到词汇:', vocab.term, '类型:', typeof vocab.examples);

                // 处理例句数组
                let examplesHtml = '';
                if (Array.isArray(vocab.examples)) {
                    examplesHtml = vocab.examples.map(example => '<li>' + example + '</li>').join('');
                } else {
                    console.warn('警告: examples不是数组');
                    examplesHtml = '<li>' + vocab.examples + '</li>';
                }

                explanationArea.innerHTML = \`
                    <div class="explanation-title">📚 词汇分析</div>
                    <p><strong>词汇:</strong> \${vocab.term}</p>
                    <p><strong>解释:</strong> \${vocab.explanation}</p>
                    <p><strong>用法:</strong> \${vocab.usage}</p>
                    <p><strong>例句:</strong></p>
                    <ul>
                        \${examplesHtml}
                    </ul>
                \`;
                
                // 阻止事件冒泡
                if (typeof event !== 'undefined' && event) {
                    event.stopPropagation();
                }
                
            } catch (error) {
                console.error('showVocabularyById函数出错:', error);
            }
        }
        
        // 返回顶部功能
        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        // 显示/隐藏返回顶部按钮
        window.addEventListener('scroll', function() {
            const backToTopBtn = document.querySelector('.back-to-top');
            if (window.pageYOffset > 300) {
                backToTopBtn.style.opacity = '1';
                backToTopBtn.style.pointerEvents = 'auto';
            } else {
                backToTopBtn.style.opacity = '0';
                backToTopBtn.style.pointerEvents = 'none';
            }
        });
        
        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', function() {
            const backToTopBtn = document.querySelector('.back-to-top');
            backToTopBtn.style.opacity = '0';
            backToTopBtn.style.transition = 'opacity 0.3s ease';
        });
    </script>
</body>
</html>`;
  };

  /**
   * 在文本中高亮重点词汇
   */
  const highlightVocabulary = (text, vocabularyList) => {
    let highlightedText = text;
    
    vocabularyList.forEach((vocab, index) => {
      // 避免重复高亮，检查是否已经被高亮
      const regex = new RegExp(`\\b${vocab.term}\\b(?![^<]*>)`, 'gi');
      
      // 使用data属性存储词汇信息，避免onclick属性过长
      const vocabId = `vocab_${index}`;
      
      highlightedText = highlightedText.replace(regex, 
        `<span class="vocabulary-word" data-vocab-id="${vocabId}" onclick="showVocabularyById('${vocabId}')">${vocab.term}</span>`
      );
    });
    
    return highlightedText;
  };


  // 如果有错误状态，显示错误页面
  if (errorState) {
    return (
      <div className="app-background">
        <div className="main-container">
          {/* 现代化头部 */}
          <div className="app-header">
            <h1 className="app-title">🎓 AI智能英语学习助手</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontSize: '1.1rem' }}>
              文件处理遇到问题
            </p>
          </div>

          <Content style={{ padding: '30px' }}>
            <ErrorPage
              errorState={errorState}
              onRetry={handleErrorRetry}
              onReset={handleErrorReset}
              fileName={fileList[0]?.name}
              englishLevel={englishLevel}
              processingTime={processingTime}
            />
          </Content>
        </div>
      </div>
    );
  }

  return (
    <div className="app-background">
      <div className="main-container">
        {/* 现代化头部 */}
        <div className="app-header">
          <h1 className="app-title">🎓 AI智能语言学习助手</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontSize: '1.1rem' }}>
            将材料转化为个性化的语言学习材料，锻炼语言思维 {result }
          </p>
        </div>

        <Content style={{ padding: '30px' }}>
          {/* 紧凑用户指引 */}
          {!result && !loading && (
            <div style={{ 
              background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)', 
              borderRadius: '12px', 
              padding: '20px', 
              marginBottom: '24px',
              border: '1px solid #e1e5e9'
            }}>
              <Row gutter={[16, 16]} align="middle">
                <Col span={18}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <BookOutlined style={{ fontSize: '24px', color: '#667eea' }} />
                    <Title level={5} style={{ margin: 0, color: '#667eea' }}>
                      AI智能英语学习助手
                    </Title>
                  </div>
                  <Text style={{ fontSize: '14px', color: '#4a5568' }}>
                    上传英语字幕文件(.txt/.srt)，AI为您生成个性化学习材料，包含句子解释和重点词汇分析
                  </Text>
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Button 
                    icon={<DownloadOutlined />}
                    size="small"
                    type="primary"
                    onClick={() => handleDemoDownload()}
                    style={{
                      background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '12px',
                      height: '32px'
                    }}
                  >
                    效果展示
                  </Button>
                </Col>
              </Row>
            </div>
          )}

          {/* 使用指引 */}
          {!result && !loading && (
            <Card style={{ 
              marginBottom: '20px', 
              background: 'linear-gradient(135deg, #fff9e6 0%, #fff5d6 100%)',
              border: '1px solid #faad14'
            }}>
              <Row gutter={[16, 8]} align="middle">
                <Col span={24}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        background: '#faad14', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '24px', 
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>1</div>
                      <Text style={{ fontSize: '13px', color: '#8c4a00' }}>
                        <FileTextOutlined /> 上传英文字幕文件(.txt/.srt)
                      </Text>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        background: '#faad14', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '24px', 
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>2</div>
                      <Text style={{ fontSize: '13px', color: '#8c4a00' }}>
                        <GlobalOutlined /> 选择英语水平(CET-4/6/雅思/托福)
                      </Text>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        background: '#faad14', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '24px', 
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>3</div>
                      <Text style={{ fontSize: '13px', color: '#8c4a00' }}>
                        <RocketOutlined /> 开始智能分析
                      </Text>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        background: '#faad14', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '24px', 
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>4</div>
                      <Text style={{ fontSize: '13px', color: '#8c4a00' }}>
                        <DownloadOutlined /> 下载学习材料
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          {/* 文件上传和设置区域 */}
          {!result && !loading && (
            <div className="upload-section">
              <Row gutter={[24, 24]}>
                <Col span={24}>
                  <Title level={4} style={{ color: '#667eea', marginBottom: '20px' }}>
                    <FileTextOutlined style={{ marginRight: '8px' }} />
                    选择学习材料
                  </Title>
                  
                </Col>
                
                <Col span={24}>
                  <Dragger {...uploadProps} style={{ background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)' }}>
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined style={{ color: '#667eea', fontSize: '48px' }} />
                    </p>
                    <p className="ant-upload-text" style={{ fontSize: '18px', fontWeight: '600', color: '#667eea' }}>
                      点击或拖拽文件到此处上传
                    </p>
                    <p className="ant-upload-hint" style={{ fontSize: '14px', color: '#718096' }}>
                      支持 .txt 和 .srt 格式的英语字幕文件，最大 5MB
                    </p>
                  </Dragger>
                </Col>

                <Col span={24}>
                  <Title level={5} style={{ color: '#667eea', marginBottom: '12px' }}>
                    <GlobalOutlined style={{ marginRight: '8px' }} />
                    选择您的英语水平
                  </Title>
                  
                  {/* 英语水平选择器 */}
                  <select 
                    value={englishLevel} 
                    onChange={(e) => {
                      setEnglishLevel(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      height: '50px',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '12px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      outline: 'none',
                      marginBottom: '16px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e1e5e9';
                    }}
                  >
                    <option value="">请选择您的英语水平</option>
                    {levelOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                </Col>

                <Col span={24} style={{ textAlign: 'center' }}>
                  <Button 
                    className="primary-button"
                    size="large"
                    loading={loading}
                    disabled={fileList.length === 0 || !englishLevel}
                    onClick={handleProcess}
                    icon={<RocketOutlined />}
                  >
                    {loading ? '智能分析中...' : '开始智能分析'}
                  </Button>
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#718096' }}>
                    <ThunderboltOutlined /> 批量处理技术，预计处理时间：1-20分钟
                  </div>
                </Col>
              </Row>
            </div>
          )}

          {/* 加载状态 - 增强版 */}
          {loading && (
            <div className="loading-container">
              <Spin size="large" />
              <Title level={3} style={{ marginTop: '24px', color: '#667eea' }}>
                正在智能分析您的学习材料...
              </Title>
              
              {/* 实时进度显示 */}
              <div style={{ width: '100%', maxWidth: '500px', margin: '20px auto' }}>
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <Text style={{ fontSize: '16px', fontWeight: '600', color: '#667eea' }}>
                    {processingStage}
                  </Text>
                </div>
                
                <Progress 
                  percent={processingProgress} 
                  strokeColor={
                    processingProgress === 100 
                    ? {
                        '0%': '#52c41a',
                        '100%': '#73d13d',
                      }
                    : {
                        '0%': '#667eea',
                        '100%': '#764ba2',
                      }
                  }
                  trailColor="#f0f0f0"
                  strokeWidth={8}
                  showInfo={true}
                  format={(percent) => 
                    percent === 100 
                    ? '🎉 100%' 
                    : `${Math.round(percent)}%`
                  }
                />
                
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <Text style={{ fontSize: '13px', color: processingProgress === 100 ? '#52c41a' : '#718096' }}>
                    {processingProgress === 100 && '🎉 处理完成！正在为您展示结果...'}
                    {processingProgress < 25 && processingProgress > 0 && '🚀 文件上传与解析阶段'}
                    {processingProgress >= 25 && processingProgress < 50 && '⚡ AI分析优化中'}
                    {processingProgress >= 50 && processingProgress < 75 && '📖 智能解释生成中'}
                    {processingProgress >= 75 && processingProgress < 90 && '🎯 词汇分析与优化'}
                    {processingProgress >= 90 && processingProgress < 100 && '✨ 最后整理与优化'}
                  </Text>
                </div>
              </div>

              {/* 超时预警 */}
              {/* 移除超时预警相关代码 */}


              {/* 处理提示 */}
              <div className="loading-steps">
                <div className="loading-step">
                  <span className="loading-step-icon">🤖</span>
                  AI智能分析文本结构
                </div>
                <div className="loading-step">
                  <span className="loading-step-icon">📚</span>
                  生成句子解释和词汇分析
                </div>
                <div className="loading-step">
                  <span className="loading-step-icon">🎯</span>
                  优化学习材料格式
                </div>
              </div>
              
              <div style={{ 
                background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', 
                borderRadius: '8px', 
                padding: '12px', 
                marginTop: '20px',
                border: '1px solid #1890ff'
              }}>
                <Text style={{ color: '#096dd9', fontSize: '13px', textAlign: 'center', display: 'block' }}>
                  💡 <strong>小贴士：</strong>处理时间约30-60秒，请耐心等待。文件越大处理时间越长，可能部分文件超过数分钟，请保持耐心，建议使用小于1MB的文件以获得最佳体验，可以适当将文件分成几部分的进行上传。
                </Text>
              </div>
            </div>
          )}

          {/* 处理结果展示 */}
          {result && !loading && (
            <div className="results-container">
              {/* 操作按钮区 */}
              <Card style={{ marginBottom: '24px', textAlign: 'center' }}>
                <Space size="large">
                  {/* 主要下载按钮（直接下载） */}
                  <Button 
                    icon={<DownloadOutlined />}
                    size="large"
                    type="primary"
                    onClick={() => {
                      console.log('🚀 [主要下载] 按钮被点击');
                      handleDownload('html');
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                      color: 'white',
                      border: 'none',
                      height: '48px',
                      fontSize: '16px'
                    }}
                  >
                    📥 下载HTML学习材料
                  </Button>
                  
                  <Button 
                    size="large"
                    onClick={() => {
                      setResult(null);
                      setFileList([]);
                      setEnglishLevel('');
                      setSelectedSentence(null);
                      setSelectedVocabulary(null);
                      setProcessingTime(null);
                      setProcessingStage('');
                      setProcessingProgress(0);
                    }}
                  >
                    🔄 重新分析
                  </Button>
                </Space>
                <div className="stats-info">
                  <Text>
                    ✅ 分析完成！共处理 {result.totalParagraphs} 个段落，{result.totalSentences} 个句子，
                    识别出 {result.vocabularyAnalysis.length} 个重点词汇
                    {processingTime && (
                      <span style={{ marginLeft: '16px', color: '#52c41a' }}>
                        <ClockCircleOutlined /> 处理时间：{(processingTime / 1000).toFixed(1)} 秒
                      </span>
                    )}
                  </Text>
                </div>
                

              </Card>

              {/* 学习材料预览 */}
              <Row gutter={[24, 24]}>
                {/* 左侧：原文材料 */}
                <Col span={16}>
                  <Card 
                    title={
                      <span style={{ color: '#667eea' }}>
                        📖 学习材料 - {result.englishLevel} 级别
                        {processingTime && (
                          <span style={{ fontSize: '12px', color: '#52c41a', marginLeft: '12px' }}>
                            ⚡ 快速处理模式
                          </span>
                        )}
                      </span>
                    } 
                    style={{ height: '70vh', overflow: 'auto' }}
                  >
                    {result.paragraphs.map((paragraph, index) => (
                      <div 
                        key={paragraph.id}
                        className="paragraph-section"
                        style={{
                          backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff7e6',
                        }}
                      >
                        <div className="paragraph-title">
                          Section {paragraph.id}: {paragraph.title}
                        </div>
                        
                        {paragraph.sentences.map(sentence => (
                          <div
                            key={sentence.id}
                            className={`sentence-interactive ${selectedSentence?.id === sentence.id ? 'selected' : ''}`}
                            onClick={() => handleSentenceClick(sentence)}
                          >
                            {sentence.text}
                          </div>
                        ))}
                      </div>
                    ))}
                  </Card>
                </Col>

                {/* 右侧：解释区域 */}
                <Col span={8}>
                  <Card 
                    title={
                      <span style={{ color: '#667eea' }}>
                        💡 智能解释面板
                      </span>
                    }
                    style={{ height: '70vh' }}
                  >
                    <div className="explanation-panel">
                      {selectedSentence ? (
                        <div className="explanation-content">
                          <div className="explanation-title">
                            💬 句子解释
                          </div>
                          <Paragraph>
                            <Text strong>原句：</Text><br/>
                            {selectedSentence.text}
                          </Paragraph>
                          <Paragraph>
                            <Text strong>英文解释：</Text><br/>
                            {selectedSentence.explanation}
                          </Paragraph>
                        </div>
                      ) : selectedVocabulary ? (
                        <div className="explanation-content">
                          <div className="explanation-title">
                            📚 词汇分析
                          </div>
                          <Paragraph>
                            <Text strong>词汇：</Text> {selectedVocabulary.term}
                          </Paragraph>
                          <Paragraph>
                            <Text strong>解释：</Text><br/>
                            {selectedVocabulary.explanation}
                          </Paragraph>
                          <Paragraph>
                            <Text strong>用法：</Text><br/>
                            {selectedVocabulary.usage}
                          </Paragraph>
                          <div>
                            <Text strong>例句：</Text>
                            <ul style={{ marginTop: '8px' }}>
                              {selectedVocabulary.examples.map((example, index) => (
                                <li key={index} style={{ marginBottom: '4px' }}>
                                  {example}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#718096', padding: '40px 20px' }}>
                          <div className="explanation-title">
                            📖 使用指南
                          </div>
                          <Paragraph>
                            点击左侧的任意句子查看详细的英文解释，
                            或点击下方的重点词汇了解其用法和例句。
                          </Paragraph>
                          {processingTime && (
                            <div style={{ marginTop: '16px', padding: '12px', background: '#f0fff0', borderRadius: '6px', border: '1px solid #52c41a' }}>
                              <Text style={{ color: '#389e0d', fontSize: '12px' }}>
                                <ThunderboltOutlined /> 本次分析采用了优化的批量处理技术，处理速度提升了3-5倍！
                              </Text>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 重点词汇列表 */}
              {result.vocabularyAnalysis && result.vocabularyAnalysis.length > 0 && (
                <Card 
                  title={
                    <span style={{ color: '#667eea' }}>
                      🔍 重点词汇和短语 ({result.vocabularyAnalysis.length} 个)
                    </span>
                  } 
                  style={{ marginTop: '24px' }}
                >
                  <Row gutter={[8, 8]}>
                    {result.vocabularyAnalysis.map((vocab, index) => (
                      <Col key={index}>
                        <Button
                          className={`vocabulary-button ${selectedVocabulary?.term === vocab.term ? 'selected' : ''}`}
                          size="small"
                          onClick={() => handleVocabularyClick(vocab)}
                        >
                          {vocab.term}
                        </Button>
                      </Col>
                    ))}
                  </Row>
                </Card>
              )}
            </div>
          )}
        </Content>
      </div>
    </div>
  );
}

export default App;
