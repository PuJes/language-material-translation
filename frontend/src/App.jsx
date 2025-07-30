import React, { useState, useEffect, useRef } from 'react'; // 引入 useEffect 和 useRef
import { Layout, Upload, Button, Select, message, Spin, Card, Typography, Row, Col, Space, Progress, Dropdown } from 'antd';
import { UploadOutlined, DownloadOutlined, BookOutlined, RocketOutlined, FileTextOutlined, GlobalOutlined, ClockCircleOutlined, ThunderboltOutlined, FilePdfOutlined, FileExclamationOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl, API_CONFIG, validateConfiguration } from './config/api.js';
import { getWebSocketManager, CONNECTION_STATES, MESSAGE_TYPES } from './services/websocket.js';
import './App.css';

const { Header, Content } = Layout;
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
  
  // 连接状态管理
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected', 'error'
  const [connectionError, setConnectionError] = useState(null); // 存储连接错误信息
  const [retryCount, setRetryCount] = useState(0); // API重试次数
  const [isRetrying, setIsRetrying] = useState(false); // 是否正在重试
  
  // 进度相关状态
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  // 移除 timeoutWarning 状态
  // const [timeoutWarning, setTimeoutWarning] = useState(false);

  // WebSocket 状态
  const [clientId, setClientId] = useState(null); // 存储后端分配的客户端ID
  const wsManager = useRef(null); // WebSocket manager instance
  const latestResultRef = useRef(null); // useRef 存储最新的 result 状态

  // 同步 latestResultRef with result state
  useEffect(() => {
    latestResultRef.current = result;
  }, [result]);

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

  // WebSocket 连接和消息处理 - 使用 WebSocket Manager
  useEffect(() => {
    // 验证配置
    if (!validateConfiguration()) {
      console.error('[App] Invalid API configuration, WebSocket connection aborted');
      setConnectionStatus('error');
      message.error({
        content: '配置错误：无法连接到服务器。应用将以降级模式运行。',
        duration: 10
      });
      return;
    }

    // 确保只在客户端环境运行
    if (typeof window !== 'undefined') {
      // 获取 WebSocket manager 实例
      wsManager.current = getWebSocketManager({
        maxReconnectAttempts: API_CONFIG.maxReconnectAttempts || 5,
        reconnectDelay: API_CONFIG.reconnectDelay || 2000,
        heartbeatInterval: 30000,
        connectionTimeout: 10000
      });

      // 设置事件处理器
      const handleStateChange = (newState, previousState) => {
        console.log(`[App] WebSocket state changed: ${previousState} -> ${newState}`);
        
        // 映射 WebSocket manager 状态到应用状态
        switch (newState) {
          case CONNECTION_STATES.CONNECTING:
            setConnectionStatus('connecting');
            setConnectionError(null);
            break;
          case CONNECTION_STATES.CONNECTED:
            setConnectionStatus('connected');
            setConnectionError(null);
            setRetryCount(0); // 重置重试计数
            // 连接成功后清除之前的错误消息
            message.success({
              content: '🟢 WebSocket连接已建立，实时功能可用',
              duration: 3
            });
            break;
          case CONNECTION_STATES.DISCONNECTED:
            setConnectionStatus('disconnected');
            setConnectionError('连接已断开');
            message.warning({
              content: '🟡 WebSocket连接已断开，正在尝试重连...',
              duration: 5
            });
            break;
          case CONNECTION_STATES.ERROR:
            setConnectionStatus('error');
            setConnectionError('连接失败');
            message.error({
              content: '🔴 WebSocket连接失败，实时功能不可用。应用将以降级模式运行。',
              duration: 8
            });
            break;
          case CONNECTION_STATES.CLOSED:
            setConnectionStatus('disconnected');
            setConnectionError('连接已关闭');
            message.info({
              content: '⚪ WebSocket连接已关闭',
              duration: 3
            });
            break;
          default:
            setConnectionStatus('disconnected');
            setConnectionError('未知状态');
        }
      };

      const handleMessage = (messageData) => {
        console.log('[App] WebSocket message received:', messageData);

        switch (messageData.type) {
          case MESSAGE_TYPES.CONNECTION_ACK:
            setClientId(messageData.clientId);
            console.log('[App] Received clientId:', messageData.clientId);
            break;
          case MESSAGE_TYPES.PROGRESS:
            setProcessingStage(messageData.stage);
            setProcessingProgress(messageData.percentage);
            if (latestResultRef.current) setResult(null); 
            setLoading(true);
            break;
          case MESSAGE_TYPES.COMPLETED:
            setResult(messageData.data); 
            setProcessingTime(messageData.data.processingTime); 
            setProcessingProgress(100); 
            setProcessingStage('✅ 处理完成！正在展示结果...'); 

            setTimeout(() => {
                setLoading(false);
                setProcessingStage(''); 
                message.success({
                    content: `分析完成！用时 ${(messageData.data.processingTime / 1000).toFixed(1)} 秒`,
                    duration: 3
                });
            }, 50);
            break;
          case MESSAGE_TYPES.ERROR:
            message.error({
              content: `处理失败: ${messageData.message}`,
              duration: 5
            });
            setLoading(false);
            setProcessingStage('');
            setProcessingProgress(0);
            setResult(null);
            break;
          default:
            console.log('[App] Unknown message type:', messageData.type);
        }
      };

      const handleError = (error) => {
        console.error('[App] WebSocket error:', error);
        setConnectionStatus('error');
        
        // 提供具体的错误信息
        let errorMessage = '连接失败';
        
        if (error.type === 'error' && error.target) {
          const ws = error.target;
          if (ws.readyState === WebSocket.CLOSED) {
            errorMessage = '连接被关闭';
            console.log('[App] WebSocket closed due to error');
          } else if (ws.readyState === WebSocket.CLOSING) {
            errorMessage = '连接正在关闭';
          } else if (ws.readyState === WebSocket.CONNECTING) {
            errorMessage = '连接超时';
          }
        } else if (error.message) {
          if (error.message.includes('timeout')) {
            errorMessage = '连接超时';
          } else if (error.message.includes('refused')) {
            errorMessage = '服务器拒绝连接';
          } else if (error.message.includes('network')) {
            errorMessage = '网络错误';
          } else {
            errorMessage = error.message;
          }
        }
        
        setConnectionError(errorMessage);
      };

      const handleClose = (event) => {
        console.log('[App] WebSocket closed:', event.code, event.reason);
        
        // Provide user feedback based on close code
        if (event.code === 1006) {
          // Abnormal closure
          console.warn('[App] WebSocket closed abnormally, connection may have been lost');
        } else if (event.code === 1000) {
          // Normal closure
          console.log('[App] WebSocket closed normally');
        }
        
        // State change handler will handle the UI updates
      };

      // 注册事件处理器
      wsManager.current.addEventListener('onStateChange', handleStateChange);
      wsManager.current.addEventListener('onMessage', handleMessage);
      wsManager.current.addEventListener('onError', handleError);
      wsManager.current.addEventListener('onClose', handleClose);

      // 开始连接
      wsManager.current.connect().catch(error => {
        console.error('[App] Failed to connect WebSocket:', error);
        setConnectionStatus('error');
        
        // Provide user-friendly error message based on error type
        let errorMessage = 'WebSocket连接失败，实时功能不可用。';
        
        if (error.message.includes('timeout')) {
          errorMessage += '连接超时，请检查网络连接。';
        } else if (error.message.includes('refused')) {
          errorMessage += '服务器拒绝连接，请稍后重试。';
        } else {
          errorMessage += '应用将以降级模式运行。';
        }
        
        message.error({
          content: errorMessage,
          duration: 10
        });
      });

      // 清理函数
      return () => {
        if (wsManager.current) {
          // 移除事件监听器
          wsManager.current.removeEventListener('onStateChange', handleStateChange);
          wsManager.current.removeEventListener('onMessage', handleMessage);
          wsManager.current.removeEventListener('onError', handleError);
          wsManager.current.removeEventListener('onClose', handleClose);
          
          // 断开连接
          wsManager.current.disconnect();
          wsManager.current = null;
        }
      };
    }
  }, []); // 空依赖数组确保只运行一次

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
   * API重试机制
   * @param {Function} apiCall - API调用函数
   * @param {number} maxRetries - 最大重试次数
   * @param {number} delay - 重试延迟（毫秒）
   * @returns {Promise} API调用结果
   */
  const retryApiCall = async (apiCall, maxRetries = 3, delay = 2000) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        
        if (attempt > 0) {
          setIsRetrying(true);
          console.log(`[API Retry] Attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
          
          // 显示重试消息
          message.info({
            content: `🔄 正在重试... (${attempt}/${maxRetries})`,
            duration: 2
          });
          
          // 等待延迟
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await apiCall();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`[API Retry] Attempt ${attempt} failed:`, error.message);
        
        // 如果是最后一次尝试，不再重试
        if (attempt === maxRetries) {
          setIsRetrying(false);
          throw error;
        }
        
        // 对于某些错误类型，不进行重试
        if (error.response?.status === 413 || // 文件过大
            error.response?.status === 415 || // 不支持的文件格式
            error.response?.status === 400) { // 客户端错误
          setIsRetrying(false);
          throw error;
        }
        
        // 指数退避：每次重试延迟翻倍
        delay = Math.min(delay * 2, 10000);
      }
    }
    
    setIsRetrying(false);
    throw lastError;
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

    // 检查 WebSocket 连接状态并实现降级处理
    const wsConnected = wsManager.current && wsManager.current.isConnected();
    const currentClientId = wsManager.current ? wsManager.current.getClientId() : null;
    
    // WebSocket 连接状态处理
    if (!wsConnected || !currentClientId) {
      const statusMessages = {
        connecting: 'WebSocket连接中，请稍候...',
        disconnected: 'WebSocket连接已断开，正在重连中...',
        error: 'WebSocket连接失败，将以降级模式处理文件（无实时进度显示）'
      };
      
      const warningMessage = statusMessages[connectionStatus] || 'WebSocket连接异常，请稍候...';
      
      if (connectionStatus === 'error') {
        // 连接错误时启用降级模式：允许上传但禁用实时功能
        message.warning({
          content: warningMessage + '。处理完成后将直接显示结果。',
          duration: 8
        });
        console.log('[App] Operating in degraded mode - no real-time progress updates');
      } else if (connectionStatus === 'connecting') {
        // 连接中时给用户选择
        message.info({
          content: warningMessage + '您可以等待连接完成或继续上传（无实时进度）。',
          duration: 6
        });
      } else {
        // 其他状态时建议等待
        message.warn({
          content: warningMessage,
          duration: 5
        });
        return;
      }
    } else {
      // WebSocket 连接正常
      console.log('[App] WebSocket connected, real-time features available');
    }

    // 重置所有状态，开始加载
    setLoading(true);
    setResult(null);
    setProcessingTime(null);
    setProcessingStage('正在准备上传...');
    setProcessingProgress(0);
    // 移除 setTimeoutWarning 相关代码
    // setTimeoutWarning(false); 
    console.log('State before HTTP request:', { loading, result, processingStage, processingProgress });
    
    try {
      const formData = new FormData();
      formData.append('file', fileList[0]);
      formData.append('englishLevel', englishLevel);
      formData.append('clientId', currentClientId || clientId); // 将 clientId 发送到后端

      console.log('开始上传文件并处理...', { clientId: currentClientId || clientId });
      
      const apiUrl = getApiUrl('/api/upload');
      console.log('[HTTP] Uploading to:', apiUrl);
      
      // 如果 WebSocket 不可用，启用降级模式
      const degradedMode = !wsConnected || !currentClientId;
      
      if (degradedMode) {
        console.log('[App] Operating in degraded mode - using HTTP-only processing');
        setProcessingStage('正在处理文件（降级模式）...');
        
        // 在降级模式下，显示模拟进度
        let progressValue = 0;
        const progressInterval = setInterval(() => {
          progressValue += Math.random() * 8 + 2; // 每次增加2-10%
          if (progressValue >= 85) {
            progressValue = 85; // 停在85%等待实际结果
          }
          setProcessingProgress(progressValue);
          
          // 更新处理阶段信息
          if (progressValue < 30) {
            setProcessingStage('正在分析文件结构（降级模式）...');
          } else if (progressValue < 60) {
            setProcessingStage('正在处理文本内容（降级模式）...');
          } else if (progressValue < 85) {
            setProcessingStage('正在生成学习材料（降级模式）...');
          }
        }, 1500);
        
        // 清理定时器的函数
        const clearProgressInterval = () => {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
        };
        
        try {
          // 使用重试机制进行API调用
          const response = await retryApiCall(async () => {
            return await axios.post(apiUrl, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              timeout: API_CONFIG.timeout,
            });
          }, 3, 2000);
          
          clearProgressInterval();
          
          // 在降级模式下，HTTP 响应包含完整结果
          if (response.data && response.data.result) {
            setResult(response.data.result);
            setProcessingTime(response.data.processingTime);
            setProcessingProgress(100);
            setProcessingStage('✅ 处理完成！');
            
            setTimeout(() => {
              setLoading(false);
              setProcessingStage('');
              message.success({
                content: `✅ 分析完成！用时 ${(response.data.processingTime / 1000).toFixed(1)} 秒（降级模式）`,
                duration: 3
              });
            }, 500);
          } else {
            throw new Error('Invalid response format in degraded mode');
          }
          
        } catch (error) {
          clearProgressInterval();
          throw error; // 重新抛出错误，让外层catch处理
        }
        
      } else {
        // WebSocket 可用，使用实时模式
        const response = await retryApiCall(async () => {
          return await axios.post(apiUrl, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: API_CONFIG.timeout,
          });
        }, 3, 2000);
        
        console.log('HTTP 请求完成:', response.data);
        console.log('State after HTTP request:', { loading, result, processingStage, processingProgress });
        
        // HTTP 请求成功只代表文件已接收，具体处理结果和进度将通过 WebSocket 传输
        message.success({
          content: `✅ 文件已上传，后端正在处理...`,
          duration: 3
        });
      }

    } catch (error) {
      console.error('❌ [HTTP请求] 处理失败:', error);
      
      // 详细的错误处理和用户友好的错误消息
      let errorMessage = '文件上传失败';
      let errorDuration = 5;
      let showRetryButton = false;
      
      if (error.response) {
        // 服务器响应错误
        const status = error.response.status;
        const serverError = error.response.data?.error || error.response.statusText;
        
        if (status === 413) {
          errorMessage = '📁 文件过大，请选择小于5MB的文件';
        } else if (status === 415) {
          errorMessage = '📄 不支持的文件格式，请上传 .txt 或 .srt 文件';
        } else if (status === 429) {
          errorMessage = '⏱️ 请求过于频繁，请稍后再试';
          showRetryButton = true;
          errorDuration = 8;
        } else if (status >= 500) {
          errorMessage = `🔧 服务器暂时不可用 (${status})，请稍后重试`;
          showRetryButton = true;
          errorDuration = 10;
        } else if (status === 400) {
          errorMessage = `❌ 请求格式错误：${serverError}`;
        } else {
          errorMessage = `⚠️ 请求失败 (${status})：${serverError}`;
          showRetryButton = true;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '⏰ 请求超时，文件可能过大或网络较慢';
        showRetryButton = true;
        errorDuration = 10;
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = '🌐 网络连接失败，请检查网络设置';
        showRetryButton = true;
        errorDuration = 10;
      } else if (error.code === 'ERR_CONNECTION_REFUSED') {
        errorMessage = '🚫 无法连接到服务器，服务可能暂时不可用';
        showRetryButton = true;
        errorDuration = 10;
      } else if (error.name === 'AbortError') {
        errorMessage = '⏹️ 请求被中断，请重试';
        showRetryButton = true;
        errorDuration = 5;
      } else {
        errorMessage = `❌ 网络错误：${error.message || '未知错误'}`;
        showRetryButton = true;
      }
      
      // 如果进行了重试，在错误消息中显示重试信息
      if (retryCount > 0) {
        errorMessage += ` (已重试 ${retryCount} 次)`;
      }
      
      // 检查网络连接状态
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        errorMessage = '🔌 网络连接异常，请检查网络设置后重试';
        errorDuration = 12;
      }
      
      // 显示错误消息，如果支持重试则添加重试按钮
      if (showRetryButton && !isRetrying) {
        message.error({
          content: (
            <div>
              <div>{errorMessage}</div>
              <div style={{ marginTop: 8 }}>
                <Button 
                  size="small" 
                  type="primary" 
                  onClick={() => {
                    message.destroy();
                    handleProcess();
                  }}
                  style={{ marginRight: 8 }}
                >
                  🔄 重试
                </Button>
                <Button 
                  size="small" 
                  onClick={() => message.destroy()}
                >
                  取消
                </Button>
              </div>
            </div>
          ),
          duration: 0, // 不自动关闭，让用户选择
          style: { marginTop: '100px' }
        });
      } else {
        message.error({
          content: errorMessage,
          duration: errorDuration,
          style: { marginTop: '100px' }
        });
      }
      
      // 错误情况下立即重置所有状态，不再等待WebSocket消息
      setLoading(false);
      setProcessingStage('');
      setProcessingProgress(0);
      setResult(null); // 错误时清空结果
      setIsRetrying(false);
      console.log('State after HTTP request error:', { loading, result, processingStage, processingProgress });
    }
  };

  // 在组件渲染前，打印最新的状态值
  console.log('Rendering App with state:', { loading, result, processingStage, processingProgress });

  /**
   * 连接状态指示器组件
   */
  const ConnectionStatusIndicator = () => {
    const getStatusConfig = () => {
      switch (connectionStatus) {
        case 'connected':
          return {
            color: '#52c41a',
            icon: '🟢',
            text: '实时连接正常',
            description: 'WebSocket连接已建立，支持实时进度更新'
          };
        case 'connecting':
          return {
            color: '#1890ff',
            icon: '🔵',
            text: '正在连接...',
            description: '正在建立WebSocket连接'
          };
        case 'disconnected':
          return {
            color: '#faad14',
            icon: '🟡',
            text: '连接已断开',
            description: '正在尝试重新连接，功能可能受限'
          };
        case 'error':
          return {
            color: '#ff4d4f',
            icon: '🔴',
            text: '连接失败',
            description: '实时功能不可用，将使用降级模式'
          };
        default:
          return {
            color: '#d9d9d9',
            icon: '⚪',
            text: '未知状态',
            description: '连接状态未知'
          };
      }
    };

    const config = getStatusConfig();
    
    return (
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        border: `2px solid ${config.color}`,
        zIndex: 1000,
        minWidth: 200,
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4
        }}>
          <span style={{ fontSize: 14 }}>{config.icon}</span>
          <span style={{ 
            fontWeight: 600, 
            color: config.color,
            fontSize: 14
          }}>
            {config.text}
          </span>
          {isRetrying && (
            <Spin size="small" style={{ marginLeft: 8 }} />
          )}
        </div>
        <div style={{
          fontSize: 12,
          color: '#666',
          lineHeight: 1.4
        }}>
          {config.description}
          {connectionError && (
            <div style={{ color: '#ff4d4f', marginTop: 4 }}>
              错误: {connectionError}
            </div>
          )}
          {retryCount > 0 && (
            <div style={{ color: '#1890ff', marginTop: 4 }}>
              重试次数: {retryCount}
            </div>
          )}
          {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
            <div style={{ marginTop: 8 }}>
              <Button 
                size="small" 
                type="primary"
                onClick={() => {
                  if (wsManager.current) {
                    wsManager.current.reconnect().catch(error => {
                      console.error('[App] Manual reconnect failed:', error);
                    });
                  }
                }}
                style={{ fontSize: 11, height: 24, padding: '0 8px' }}
              >
                🔄 重连
              </Button>
            </div>
          )}
        </div>
      </div>
    );
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

  // 连接状态指示器组件
  const ConnectionStatus = () => {
    const statusConfig = {
      connecting: { color: '#faad14', text: '连接中...', icon: '🔄' },
      connected: { color: '#52c41a', text: '实时连接', icon: '✅' },
      disconnected: { color: '#fa8c16', text: '重连中...', icon: '⚠️' },
      error: { color: '#ff4d4f', text: '降级模式', icon: '❌' }
    };
    
    const status = statusConfig[connectionStatus] || statusConfig.error;
    
    // 手动重连功能
    const handleManualReconnect = () => {
      if (wsManager.current && connectionStatus !== 'connected') {
        console.log('[App] Manual reconnection triggered');
        wsManager.current.connect().catch(error => {
          console.error('[App] Manual reconnection failed:', error);
        });
      }
    };
    
    return (
      <div 
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '6px 12px',
          borderRadius: '16px',
          fontSize: '12px',
          color: status.color,
          border: `1px solid ${status.color}`,
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          cursor: connectionStatus === 'error' || connectionStatus === 'disconnected' ? 'pointer' : 'default',
          transition: 'all 0.3s ease'
        }}
        onClick={connectionStatus === 'error' || connectionStatus === 'disconnected' ? handleManualReconnect : undefined}
        title={connectionStatus === 'error' || connectionStatus === 'disconnected' ? '点击重新连接' : status.text}
      >
        {status.icon} {status.text}
        {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
          <span style={{ marginLeft: '4px', fontSize: '10px' }}>🔄</span>
        )}
      </div>
    );
  };

  return (
    <div className="app-background">
      <ConnectionStatusIndicator />
      <ConnectionStatus />
      <div className="main-container">
        {/* 现代化头部 */}
        <div className="app-header">
          <h1 className="app-title">🎓 AI智能英语学习助手</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontSize: '1.1rem' }}>
            将影视字幕转化为个性化学习材料 {result && processingTime && (
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                ⚡ 已优化处理速度
              </span>
            )}
          </p>
        </div>

        <Content style={{ padding: '30px' }}>
          {/* 欢迎卡片 */}
          {!result && !loading && (
            <Card className="welcome-card">
              <div className="welcome-content">
                <div className="welcome-icon">
                  <BookOutlined />
                </div>
                <Title level={3} style={{ color: '#667eea', marginBottom: '16px' }}>
                  欢迎使用智能语言学习助手
                </Title>
                <Paragraph style={{ fontSize: '16px', color: '#4a5568', marginBottom: '16px' }}>
                  上传英语字幕文件，我们将为您生成个性化的学习材料，包括句子解释、重点词汇分析和互动式学习体验。
                </Paragraph>
                <div style={{ background: 'linear-gradient(135deg, #e8f5e8, #f0fff0)', padding: '12px', borderRadius: '8px', border: '1px solid #52c41a' }}>
                  <Text style={{ color: '#389e0d', fontSize: '14px' }}>
                    <ThunderboltOutlined /> 新功能：采用批量处理技术，分析速度提升 3-5 倍！
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {/* 演示下载区域 */}
          {!result && !loading && (
            <Card style={{ marginBottom: '24px', textAlign: 'center', background: 'linear-gradient(135deg, #e8f5e8, #f0fff0)', border: '1px solid #52c41a' }}>
              <Title level={5} style={{ color: '#389e0d', marginBottom: '16px' }}>
                🎯 立即体验下载功能
              </Title>
              <Paragraph style={{ color: '#389e0d', marginBottom: '16px' }}>
                无需上传文件，点击下方按钮立即下载演示版学习材料，体验完整的交互功能！
              </Paragraph>
              <Button 
                icon={<DownloadOutlined />}
                size="large"
                type="primary"
                onClick={() => handleDemoDownload()}
                style={{
                  background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                  color: 'white',
                  border: 'none',
                  height: '48px',
                  fontSize: '16px'
                }}
              >
                🎯 下载演示版学习材料
              </Button>
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
                  
                  {/* WebSocket状态通知 */}
                  {connectionStatus === 'error' && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fff2e8 0%, #ffebe0 100%)',
                      border: '2px solid #ff9500',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ fontSize: 16 }}>⚠️</span>
                      <div>
                        <Text strong style={{ color: '#d46b08', fontSize: 13 }}>
                          实时功能不可用
                        </Text>
                        <div style={{ fontSize: 12, color: '#8c4a00', marginTop: 2 }}>
                          将以降级模式运行，处理完成后直接显示结果（无实时进度）
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {connectionStatus === 'connected' && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                      border: '2px solid #52c41a',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ fontSize: 16 }}>✅</span>
                      <div>
                        <Text strong style={{ color: '#389e0d', fontSize: 13 }}>
                          实时功能已启用
                        </Text>
                        <div style={{ fontSize: 12, color: '#237804', marginTop: 2 }}>
                          支持实时进度显示和状态更新
                        </div>
                      </div>
                    </div>
                  )}
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
                    <ThunderboltOutlined /> 批量处理技术，预计处理时间：30-60秒
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
                    {processingProgress >= 25 && processingProgress < 50 && '⚡ AI分析优化中（批量处理技术）'}
                    {processingProgress >= 50 && processingProgress < 75 && '📖 智能解释生成中'}
                    {processingProgress >= 75 && processingProgress < 90 && '🎯 词汇分析与优化'}
                    {processingProgress >= 90 && processingProgress < 100 && '✨ 最后整理与优化'}
                  </Text>
                </div>
              </div>

              {/* 超时预警 */}
              {/* 移除超时预警相关代码 */}

              {/* 连接状态提示 */}
              {connectionStatus === 'error' && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff2e8 0%, #ffebe0 100%)',
                  border: '2px solid #ff9500',
                  borderRadius: 12,
                  padding: 16,
                  margin: '16px auto',
                  maxWidth: 400
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <Text strong style={{ color: '#d46b08' }}>降级模式运行</Text>
                  </div>
                  <Text style={{ fontSize: 13, color: '#8c4a00' }}>
                    实时连接不可用，无法显示详细进度。处理完成后将直接显示结果。
                  </Text>
                </div>
              )}
              
              {connectionStatus === 'disconnected' && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff7e6 0%, #ffeaa7 100%)',
                  border: '2px solid #faad14',
                  borderRadius: 12,
                  padding: 16,
                  margin: '16px auto',
                  maxWidth: 400
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>🔄</span>
                    <Text strong style={{ color: '#d48806' }}>正在重连</Text>
                  </div>
                  <Text style={{ fontSize: 13, color: '#ad6800' }}>
                    连接已断开，正在尝试重新连接以获取实时进度更新。
                  </Text>
                </div>
              )}

              {/* 处理提示 */}
              <div className="loading-steps">
                <div className="loading-step">
                  <span className="loading-step-icon">⚡</span>
                  使用批量处理技术，大幅提升处理速度
                </div>
                <div className="loading-step">
                  <span className="loading-step-icon">🤖</span>
                  AI正在批量生成英文解释
                </div>
                <div className="loading-step">
                  <span className="loading-step-icon">📚</span>
                  正在快速分析重点词汇
                </div>
                <div className="loading-step">
                  <span className="loading-step-icon">🎯</span>
                  正在优化学习内容
                </div>
                {isRetrying && (
                  <div className="loading-step" style={{ color: '#1890ff' }}>
                    <Spin size="small" className="loading-step-icon" />
                    <span>正在重试连接... ({retryCount}/3)</span>
                  </div>
                )}
              </div>
              
              <Text style={{ color: '#718096', marginTop: '16px', display: 'block', textAlign: 'center' }}>
                优化后的处理时间：约30-60秒（短文档）| 2-8分钟（长文档），请耐心等待真实进度
              </Text>
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
                  
                  {/* 高级下载选项（Dropdown菜单） */}
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'html',
                          label: (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FilePdfOutlined style={{ color: '#ff6b35' }} />
                              下载HTML格式 (推荐)
                            </span>
                          ),
                          onClick: ({ key }) => {
                            console.log('🔧 [Dropdown] HTML选项被点击');
                            handleDownload('html');
                          }
                        },
                        {
                          key: 'txt',
                          label: (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileExclamationOutlined style={{ color: '#52c41a' }} />
                              下载文本格式
                            </span>
                          ),
                          onClick: ({ key }) => {
                            console.log('🔧 [Dropdown] TXT选项被点击');
                            handleDownload('txt');
                          }
                        }
                      ]
                    }}
                    onOpenChange={(visible) => {
                      console.log('🔧 [Dropdown] 下拉菜单状态变化:', visible);
                    }}
                    placement="bottomCenter"
                  >
                    <Button 
                      className="download-button"
                      icon={<DownloadOutlined />}
                      size="large"
                      style={{
                        background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      ⚙️ 更多格式选项 ▼
                    </Button>
                  </Dropdown>
                  
                  {/* 演示下载按钮 */}
                  <Button 
                    icon={<DownloadOutlined />}
                    size="large"
                    type="default"
                    onClick={() => handleDemoDownload()}
                    style={{
                      background: 'linear-gradient(135deg, #ffa940 0%, #ffc53d 100%)',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    🎯 演示下载功能
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
                      // 移除 setTimeoutWarning 相关代码
                      // setTimeoutWarning(false);
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
