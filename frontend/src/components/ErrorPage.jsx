import React from 'react';
import { Button, Typography, Tag, Collapse } from 'antd';
import { 
  ReloadOutlined, 
  HomeOutlined, 
  BugOutlined,
  ClockCircleOutlined,
  WifiOutlined,
  FileExclamationOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import './ErrorPage.css';

const { Title, Text } = Typography;
const { Panel } = Collapse;

/**
 * 错误页面组件 - 简洁明亮设计
 * 显示文件处理失败的详细信息和解决方案
 */
const ErrorPage = ({ 
  errorState, 
  onRetry, 
  onReset, 
  fileName, 
  englishLevel,
  processingTime 
}) => {
  if (!errorState) return null;

  const {
    type,
    message,
    code,
    statusCode,
    timestamp,
    retryCount,
    networkStatus,
    suggestions
  } = errorState;

  // 根据错误类型获取图标
  const getErrorTypeInfo = (errorType) => {
    switch (errorType) {
      case 'NETWORK_ERROR':
        return { icon: <WifiOutlined />, title: '网络连接失败' };
      case 'TIMEOUT_ERROR':
        return { icon: <ClockCircleOutlined />, title: '请求超时' };
      case 'FILE_ERROR':
        return { icon: <FileExclamationOutlined />, title: '文件处理失败' };
      case 'SERVER_ERROR':
        return { icon: <BugOutlined />, title: '服务器错误' };
      case 'SERVICE_ERROR':
        return { icon: <BugOutlined />, title: '服务不可用' };
      case 'VALIDATION_ERROR':
        return { icon: <WarningOutlined />, title: '参数验证失败' };
      case 'AUTHENTICATION_ERROR':
        return { icon: <ExclamationCircleOutlined />, title: 'API认证失败' };
      default:
        return { icon: <ExclamationCircleOutlined />, title: '处理失败' };
    }
  };

  const errorInfo = getErrorTypeInfo(type);

  // 获取解决方案建议
  const getSuggestions = () => {
    const defaultSuggestions = [];
    
    switch (type) {
      case 'NETWORK_ERROR':
        defaultSuggestions.push(
          '检查网络连接是否正常',
          '尝试刷新页面后重新上传',
          '如果使用VPN，请尝试关闭后重试',
          '检查防火墙设置是否阻止了连接'
        );
        break;
      case 'TIMEOUT_ERROR':
        defaultSuggestions.push(
          '尝试上传更小的文件（建议小于1MB）',
          '检查网络速度是否过慢',
          '稍后再试，服务器可能正在处理大量请求',
          '将长文本分割成多个较短的文件'
        );
        break;
      case 'FILE_ERROR':
        defaultSuggestions.push(
          '确保文件格式为 .txt 或 .srt',
          '检查文件内容是否为有效的文本',
          '尝试重新保存文件并确保编码为UTF-8',
          '如果是字幕文件，确保格式符合SRT标准'
        );
        break;
      case 'SERVER_ERROR':
        defaultSuggestions.push(
          '服务器暂时不可用，请过一段时间重试',
          '尝试刷新页面后重新操作，若重试无法使用，请联系技术'
        );
        break;
      case 'SERVICE_ERROR':
        defaultSuggestions.push(
          'AI服务正在维护或过载',
          '请稍后重试',
          '如果问题持续存在，请联系技术支持'
        );
        break;
      case 'AUTHENTICATION_ERROR':
        defaultSuggestions.push(
          '请联系管理员检查API密钥配置',
          '确认API密钥是否已过期',
          '检查API服务是否正常运行',
          '如果问题持续存在，请联系技术支持'
        );
        break;
      default:
        defaultSuggestions.push(
          '请检查文件格式和大小',
          '确保网络连接正常',
          '尝试刷新页面后重新操作',
          '如果问题持续，请联系技术支持'
        );
    }

    return suggestions || defaultSuggestions;
  };

  return (
    <div className="error-page-container">
      <div className="error-page-content">
        {/* 主要错误信息区域 */}
        <div className="error-hero">
          <div className="error-illustration">
            <div className="error-icon-wrapper">
              <div className="error-icon-bg">
                {errorInfo.icon}
              </div>
            </div>
          </div>
          <div className="error-text">
            <Title level={2} className="error-title">
              {errorInfo.title}
            </Title>
            <Text className="error-subtitle">
              {message}
            </Text>
          </div>
        </div>

        {/* 文件信息卡片 */}
        {fileName && (
          <div className="file-info-card">
            <div className="file-info-header">
              <FileExclamationOutlined />
              <span>处理文件信息</span>
            </div>
            <div className="file-info-content">
              <Tag color="blue">文件: {fileName}</Tag>
              {englishLevel && <Tag color="green">英语水平: {englishLevel}</Tag>}
              {processingTime && (
                <Tag color="orange">
                  处理时间: {(processingTime / 1000).toFixed(1)}秒
                </Tag>
              )}
            </div>
          </div>
        )}

        {/* 详细信息折叠面板 */}
        <div className="error-details">
          <Collapse 
            defaultActiveKey={['1']} 
            expandIcon={({ isActive }) => <RightOutlined rotate={isActive ? 90 : 0} />}
          >
            <Panel 
              header={
                <div className="collapse-label">
                  <InfoCircleOutlined />
                  <span>错误详情</span>
                </div>
              } 
              key="1"
            >
              <div className="error-detail-content">
                <div className="error-message">
                  <Text strong>详细信息：</Text>
                  <br />
                  <Text>{message}</Text>
                </div>
                
                <div className="error-tags">
                  {code && <Tag color="red">错误代码: {code}</Tag>}
                  {statusCode && <Tag color="orange">HTTP状态: {statusCode}</Tag>}
                  {networkStatus && (
                    <Tag color={networkStatus === 'connected' ? 'green' : 'red'}>
                      网络状态: {networkStatus === 'connected' ? '正常' : '异常'}
                    </Tag>
                  )}
                  <Tag color="blue">
                    错误时间: {new Date(timestamp).toLocaleString()}
                  </Tag>
                </div>
              </div>
            </Panel>

            <Panel 
              header={
                <div className="collapse-label">
                  <QuestionCircleOutlined />
                  <span>解决方案</span>
                </div>
              } 
              key="2"
            >
              <div className="solutions-content">
                {getSuggestions().map((suggestion, index) => (
                  <div key={index} className="solution-item">
                    <div className="solution-arrow">•</div>
                    <Text>{suggestion}</Text>
                  </div>
                ))}
              </div>
            </Panel>
          </Collapse>
        </div>

        {/* 操作按钮 */}
        <div className="error-actions">
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={onRetry}
            className="retry-button"
          >
            重新处理
          </Button>
          <Button 
            icon={<HomeOutlined />} 
            onClick={onReset}
            className="home-button"
          >
            重新开始
          </Button>
        </div>

        {/* 底部信息 */}
        <div className="error-footer">
          <Text type="secondary">
            如果问题持续存在，请联系技术支持 | 错误ID: {code || 'UNKNOWN'}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;