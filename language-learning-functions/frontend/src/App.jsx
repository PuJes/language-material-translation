import React, { useState } from 'react';
import { 
  Upload, 
  Button, 
  Select, 
  Progress, 
  Card, 
  message, 
  Typography, 
  Space,
  Alert,
  Spin
} from 'antd';
import { 
  InboxOutlined, 
  DownloadOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import cloudbaseService from './services/cloudbase';
import './App.css';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

function App() {
  const [file, setFile] = useState(null);
  const [englishLevel, setEnglishLevel] = useState('CET-4');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 文件上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.txt,.srt',
    beforeUpload: (file) => {
      // 文件大小检查 (5MB)
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('文件大小不能超过5MB!');
        return false;
      }

      // 文件类型检查
      const isValidType = file.name.toLowerCase().endsWith('.txt') || 
                         file.name.toLowerCase().endsWith('.srt');
      if (!isValidType) {
        message.error('只支持 .txt 和 .srt 格式的文件!');
        return false;
      }

      setFile(file);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFile(null);
    },
    fileList: file ? [file] : [],
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (!file) {
      message.error('请选择要上传的文件');
      return;
    }

    if (!englishLevel) {
      message.error('请选择英语水平');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setResult(null);
      setProgress(0);

      // 上传文件
      const uploadResult = await cloudbaseService.uploadFile(file, englishLevel);
      setTaskId(uploadResult.taskId);
      setUploading(false);
      setProcessing(true);
      setStatus('文件上传成功，开始处理...');

      // 开始轮询状态
      await cloudbaseService.pollTaskStatus(
        uploadResult.taskId,
        (statusData) => {
          setProgress(statusData.progress || 0);
          setStatus(statusData.message || '处理中...');
        }
      );

      // 处理完成
      setProcessing(false);
      setStatus('处理完成！');
      message.success('文件处理完成！');

    } catch (error) {
      console.error('处理失败:', error);
      setUploading(false);
      setProcessing(false);
      setError(error.message || '处理失败，请重试');
      message.error(error.message || '处理失败，请重试');
    }
  };

  // 下载结果
  const handleDownload = async () => {
    if (!taskId) {
      message.error('没有可下载的结果');
      return;
    }

    try {
      const downloadResult = await cloudbaseService.downloadResult(taskId);
      
      // 创建下载链接
      const blob = new Blob([downloadResult.content], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setResult(downloadResult);
      message.success('下载成功！');
    } catch (error) {
      console.error('下载失败:', error);
      message.error(error.message || '下载失败，请重试');
    }
  };

  // 重置状态
  const handleReset = () => {
    setFile(null);
    setTaskId(null);
    setProgress(0);
    setStatus('');
    setResult(null);
    setError(null);
    setUploading(false);
    setProcessing(false);
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <Title level={1}>
            <FileTextOutlined /> 智能语言学习助手
          </Title>
          <Paragraph>
            上传英语字幕文件，AI智能生成个性化学习材料
          </Paragraph>
        </div>

        <Card className="upload-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 英语水平选择 */}
            <div>
              <Text strong>选择英语水平：</Text>
              <Select
                value={englishLevel}
                onChange={setEnglishLevel}
                style={{ width: 200, marginLeft: 10 }}
                disabled={uploading || processing}
              >
                <Option value="CET-4">英语四级 (CET-4)</Option>
                <Option value="CET-6">英语六级 (CET-6)</Option>
                <Option value="IELTS">雅思 (IELTS)</Option>
                <Option value="TOEFL">托福 (TOEFL)</Option>
              </Select>
            </div>

            {/* 文件上传 */}
            <Dragger {...uploadProps} disabled={uploading || processing}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .txt 和 .srt 格式，文件大小不超过 5MB
              </p>
            </Dragger>

            {/* 上传按钮 */}
            <Button
              type="primary"
              size="large"
              onClick={handleUpload}
              loading={uploading}
              disabled={!file || processing}
              style={{ width: '100%' }}
            >
              {uploading ? '上传中...' : '开始处理'}
            </Button>
          </Space>
        </Card>

        {/* 处理进度 */}
        {(processing || progress > 0) && (
          <Card className="progress-card">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Spin spinning={processing}>
                  <CheckCircleOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: processing ? '#1890ff' : '#52c41a' 
                    }} 
                  />
                </Spin>
              </div>
              
              <Progress 
                percent={progress} 
                status={processing ? 'active' : 'success'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              
              <Text style={{ textAlign: 'center', display: 'block' }}>
                {status}
              </Text>

              {!processing && progress === 100 && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  size="large"
                  style={{ width: '100%' }}
                >
                  下载学习材料
                </Button>
              )}
            </Space>
          </Card>
        )}

        {/* 错误信息 */}
        {error && (
          <Alert
            message="处理失败"
            description={error}
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            action={
              <Button size="small" onClick={handleReset}>
                重新开始
              </Button>
            }
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* 结果信息 */}
        {result && (
          <Card className="result-card">
            <Title level={4}>处理完成</Title>
            <Space direction="vertical">
              <Text>原文件：{result.data.originalFileName}</Text>
              <Text>英语水平：{result.data.englishLevel}</Text>
              <Text>文件大小：{(result.size / 1024).toFixed(2)} KB</Text>
              <Text>处理时间：{result.data.processingTime}</Text>
              
              <Button
                type="link"
                onClick={handleReset}
                style={{ padding: 0 }}
              >
                处理新文件
              </Button>
            </Space>
          </Card>
        )}

        {/* 功能说明 */}
        <Card className="info-card">
          <Title level={4}>功能说明</Title>
          <ul>
            <li>支持上传 .txt 和 .srt 格式的英语字幕文件</li>
            <li>AI智能分析句子结构和重点词汇</li>
            <li>根据选择的英语水平生成个性化学习材料</li>
            <li>生成HTML格式的学习材料，支持离线查看</li>
            <li>文件大小限制：5MB以内</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default App;