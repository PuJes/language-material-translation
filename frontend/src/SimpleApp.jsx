import React, { useState } from 'react';
import { Layout, Upload, Button, message, Spin, Card, Typography, Row, Col, Space } from 'antd';
import { UploadOutlined, DownloadOutlined, BookOutlined, RocketOutlined, FileTextOutlined, GlobalOutlined } from '@ant-design/icons';
import axios from 'axios';
import './App.css';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

function SimpleApp() {
  const [fileList, setFileList] = useState([]);
  const [englishLevel, setEnglishLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const levelOptions = [
    { value: 'CET-4', label: '🎯 英语四级 (CET-4)', description: '基础词汇与语法' },
    { value: 'CET-6', label: '🚀 英语六级 (CET-6)', description: '进阶词汇与表达' },
    { value: 'IELTS', label: '🌍 雅思 (IELTS)', description: '国际英语水平' },
    { value: 'TOEFL', label: '🎓 托福 (TOEFL)', description: '学术英语能力' }
  ];

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
      
      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    }
  };

  const handleProcess = async () => {
    if (fileList.length === 0) {
      message.error('请先上传文件！');
      return;
    }
    
    if (!englishLevel) {
      message.error('请选择英语水平！');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', fileList[0]);
      formData.append('englishLevel', englishLevel);

      const response = await axios.post('http://localhost:3001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 延长到10分钟 (600秒)
      });

      setResult(response.data.data);
      message.success('分析完成！');
      
    } catch (error) {
      console.error('处理失败:', error);
      if (error.response) {
        message.error(error.response.data.error || '处理失败');
      } else {
        message.error('网络错误，请检查后端服务是否启动');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-background">
      <div className="main-container">
        <div className="app-header">
          <h1 className="app-title">🎓 智能语言学习助手 (简化版)</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontSize: '1.1rem' }}>
            使用原生HTML选择器确保兼容性
          </p>
        </div>

        <Content style={{ padding: '30px' }}>
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
                    选择您的英语水平 (原生HTML选择器)
                  </Title>
                  
                  {/* 原生HTML选择器 */}
                  <select 
                    value={englishLevel} 
                    onChange={(e) => {
                      console.log('原生选择器值变化:', e.target.value);
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
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e1e5e9';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">请选择您的英语水平</option>
                    {levelOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                  
                  {/* 调试信息 */}
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: '#718096',
                    padding: '8px',
                    background: '#f8faff',
                    borderRadius: '4px',
                    border: '1px solid #e1e5e9'
                  }}>
                    <Text style={{ fontSize: '12px' }}>
                      💡 当前选择: "{englishLevel || '未选择'}" | 
                      原生HTML选择器版本，确保100%兼容性
                    </Text>
                  </div>
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
                </Col>
              </Row>
            </div>
          )}

          {loading && (
            <div className="loading-container">
              <Spin size="large" />
              <Title level={3} style={{ marginTop: '24px', color: '#667eea' }}>
                正在智能分析您的学习材料...
              </Title>
            </div>
          )}

          {result && (
            <div>
              <h2>分析结果已生成！</h2>
              <p>共处理了 {result.totalParagraphs} 个段落</p>
            </div>
          )}
        </Content>
      </div>
    </div>
  );
}

export default SimpleApp; 