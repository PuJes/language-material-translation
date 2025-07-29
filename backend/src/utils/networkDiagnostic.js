/**
 * 网络诊断工具
 * 用于监控和诊断网络连接问题
 */

const axios = require('axios');
const https = require('https');
const Logger = require('./logger');

class NetworkDiagnostic {
  constructor() {
    this.testEndpoints = [
      'https://httpbin.org/get',
      'https://api.deepseek.com',
      'https://www.google.com'
    ];
    this.timeout = 10000;
  }

  /**
   * 执行完整的网络诊断
   * @returns {Promise<Object>} 诊断结果
   */
  async runFullDiagnostic() {
    Logger.info('开始网络诊断');
    
    const results = {
      timestamp: new Date().toISOString(),
      basicConnectivity: null,
      dnsResolution: null,
      apiConnectivity: null,
      latency: null,
      recommendations: []
    };

    try {
      // 基本连接测试
      results.basicConnectivity = await this.testBasicConnectivity();
      
      // DNS解析测试
      results.dnsResolution = await this.testDNSResolution();
      
      // API连接测试
      results.apiConnectivity = await this.testAPIConnectivity();
      
      // 延迟测试
      results.latency = await this.testLatency();
      
      // 生成建议
      results.recommendations = this.generateRecommendations(results);
      
      Logger.info('网络诊断完成', { 
        basicConnectivity: results.basicConnectivity.success,
        dnsResolution: results.dnsResolution.success,
        apiConnectivity: results.apiConnectivity.success
      });
      
      return results;
      
    } catch (error) {
      Logger.error('网络诊断失败', { error: error.message });
      results.error = error.message;
      return results;
    }
  }

  /**
   * 测试基本网络连接
   * @returns {Promise<Object>} 测试结果
   */
  async testBasicConnectivity() {
    const result = {
      success: false,
      endpoints: [],
      error: null
    };

    for (const endpoint of this.testEndpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(endpoint, {
          timeout: this.timeout,
          validateStatus: () => true
        });
        const endTime = Date.now();
        
        result.endpoints.push({
          url: endpoint,
          status: response.status,
          responseTime: endTime - startTime,
          success: response.status < 400
        });
        
      } catch (error) {
        result.endpoints.push({
          url: endpoint,
          error: error.message,
          code: error.code,
          success: false
        });
      }
    }

    result.success = result.endpoints.some(ep => ep.success);
    return result;
  }

  /**
   * 测试DNS解析
   * @returns {Promise<Object>} 测试结果
   */
  async testDNSResolution() {
    const result = {
      success: false,
      domains: [],
      error: null
    };

    const domains = ['api.deepseek.com', 'www.google.com', 'httpbin.org'];
    
    for (const domain of domains) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`https://${domain}`, {
          timeout: this.timeout,
          validateStatus: () => true
        });
        const endTime = Date.now();
        
        result.domains.push({
          domain,
          resolved: true,
          responseTime: endTime - startTime,
          status: response.status
        });
        
      } catch (error) {
        result.domains.push({
          domain,
          resolved: false,
          error: error.message,
          code: error.code
        });
      }
    }

    result.success = result.domains.some(d => d.resolved);
    return result;
  }

  /**
   * 测试API连接
   * @returns {Promise<Object>} 测试结果
   */
  async testAPIConnectivity() {
    const result = {
      success: false,
      details: null,
      error: null
    };

    try {
      const startTime = Date.now();
      
      // 测试DeepSeek API端点连接（不需要认证的测试）
      const response = await axios.get('https://api.deepseek.com/chat/completions', {
        timeout: this.timeout,
        validateStatus: () => true, // 接受任何状态码
        headers: {
          'User-Agent': 'LanguageLearningAssistant/2.0.0'
        }
      });
      
      const endTime = Date.now();
      
      result.details = {
        responseTime: endTime - startTime,
        status: response.status,
        headers: {
          server: response.headers.server,
          contentType: response.headers['content-type'],
          allow: response.headers.allow
        }
      };
      
      // 401状态码表示端点存在但需要认证，这是正常的
      result.success = response.status === 401 || response.status < 400;
      
    } catch (error) {
      result.error = {
        message: error.message,
        code: error.code,
        status: error.response?.status
      };
      result.success = false;
    }

    return result;
  }

  /**
   * 测试网络延迟
   * @returns {Promise<Object>} 测试结果
   */
  async testLatency() {
    const result = {
      averageLatency: 0,
      measurements: [],
      success: false
    };

    const testCount = 3;
    const latencies = [];

    for (let i = 0; i < testCount; i++) {
      try {
        const startTime = Date.now();
        await axios.get('https://httpbin.org/get', {
          timeout: this.timeout
        });
        const endTime = Date.now();
        
        const latency = endTime - startTime;
        latencies.push(latency);
        
        result.measurements.push({
          attempt: i + 1,
          latency,
          success: true
        });
        
      } catch (error) {
        result.measurements.push({
          attempt: i + 1,
          error: error.message,
          success: false
        });
      }
      
      // 延迟间隔
      if (i < testCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (latencies.length > 0) {
      result.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      result.success = true;
    }

    return result;
  }

  /**
   * 生成网络优化建议
   * @param {Object} results - 诊断结果
   * @returns {Array} 建议列表
   */
  generateRecommendations(results) {
    const recommendations = [];

    // 基本连接建议
    if (!results.basicConnectivity?.success) {
      recommendations.push({
        type: 'critical',
        title: '网络连接问题',
        description: '检测到基本网络连接失败，请检查网络设置',
        action: '检查网络连接和防火墙设置'
      });
    }

    // DNS解析建议
    if (!results.dnsResolution?.success) {
      recommendations.push({
        type: 'warning',
        title: 'DNS解析问题',
        description: '部分域名解析失败，可能影响API调用',
        action: '尝试更换DNS服务器或检查网络配置'
      });
    }

    // API连接建议
    if (!results.apiConnectivity?.success) {
      recommendations.push({
        type: 'critical',
        title: 'API连接失败',
        description: '无法连接到DeepSeek API服务器',
        action: '检查API配置和网络代理设置'
      });
    }

    // 延迟建议
    if (results.latency?.success) {
      const avgLatency = results.latency.averageLatency;
      if (avgLatency > 5000) {
        recommendations.push({
          type: 'warning',
          title: '网络延迟较高',
          description: `平均延迟 ${avgLatency}ms，可能影响API响应速度`,
          action: '考虑优化网络连接或增加超时时间'
        });
      } else if (avgLatency < 1000) {
        recommendations.push({
          type: 'info',
          title: '网络连接良好',
          description: `平均延迟 ${avgLatency}ms，网络性能优秀`,
          action: '无需额外优化'
        });
      }
    }

    // 连接稳定性建议
    const failedEndpoints = results.basicConnectivity?.endpoints.filter(ep => !ep.success) || [];
    if (failedEndpoints.length > 0) {
      recommendations.push({
        type: 'warning',
        title: '部分端点连接失败',
        description: `${failedEndpoints.length} 个测试端点连接失败`,
        action: '检查网络稳定性和防火墙规则'
      });
    }

    return recommendations;
  }

  /**
   * 生成诊断报告
   * @param {Object} results - 诊断结果
   * @returns {string} 格式化的报告
   */
  generateReport(results) {
    let report = '🌐 网络诊断报告\n';
    report += '='.repeat(50) + '\n';
    report += `时间: ${results.timestamp}\n\n`;

    // 基本连接状态
    report += '📡 基本连接状态:\n';
    if (results.basicConnectivity?.success) {
      report += '✅ 网络连接正常\n';
      results.basicConnectivity.endpoints.forEach(ep => {
        const status = ep.success ? '✅' : '❌';
        report += `   ${status} ${ep.url}: ${ep.responseTime || 'N/A'}ms\n`;
      });
    } else {
      report += '❌ 网络连接异常\n';
    }

    // DNS解析状态
    report += '\n🔍 DNS解析状态:\n';
    if (results.dnsResolution?.success) {
      report += '✅ DNS解析正常\n';
      results.dnsResolution.domains.forEach(d => {
        const status = d.resolved ? '✅' : '❌';
        report += `   ${status} ${d.domain}\n`;
      });
    } else {
      report += '❌ DNS解析异常\n';
    }

    // API连接状态
    report += '\n🔗 API连接状态:\n';
    if (results.apiConnectivity?.success) {
      report += '✅ API连接正常\n';
      report += `   响应时间: ${results.apiConnectivity.details.responseTime}ms\n`;
      report += `   状态码: ${results.apiConnectivity.details.status}\n`;
    } else {
      report += '❌ API连接异常\n';
      if (results.apiConnectivity?.error) {
        report += `   错误: ${results.apiConnectivity.error.message}\n`;
      }
    }

    // 延迟信息
    if (results.latency?.success) {
      report += '\n⏱️  网络延迟:\n';
      report += `   平均延迟: ${results.latency.averageLatency.toFixed(0)}ms\n`;
      report += `   测试次数: ${results.latency.measurements.length}\n`;
    }

    // 建议
    if (results.recommendations?.length > 0) {
      report += '\n💡 优化建议:\n';
      results.recommendations.forEach((rec, index) => {
        const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        report += `   ${index + 1}. ${icon} ${rec.title}\n`;
        report += `      ${rec.description}\n`;
        report += `      建议: ${rec.action}\n\n`;
      });
    }

    return report;
  }

  /**
   * 记录错误诊断信息
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {Object} 诊断结果
   */
  logErrorDiagnosis(error, context = {}) {
    const diagnosis = {
      timestamp: new Date().toISOString(),
      errorType: this.classifyError(error),
      errorMessage: error.message,
      errorCode: error.code,
      context: context,
      recommendations: []
    };

    // 根据错误类型生成建议
    switch (diagnosis.errorType) {
      case 'CONNECTION_RESET':
        diagnosis.recommendations.push({
          type: 'warning',
          title: '网络连接重置',
          description: '网络连接被重置，可能是网络不稳定或服务器负载过高',
          action: '建议稍后重试或检查网络连接'
        });
        break;
      case 'TIMEOUT':
        diagnosis.recommendations.push({
          type: 'warning',
          title: '请求超时',
          description: '请求超时，可能是网络延迟过高或服务器响应慢',
          action: '建议增加超时时间或稍后重试'
        });
        break;
      case 'DNS_ERROR':
        diagnosis.recommendations.push({
          type: 'critical',
          title: 'DNS解析失败',
          description: '域名解析失败，可能是DNS问题或网络连接中断',
          action: '建议检查网络连接或更换DNS服务器'
        });
        break;
      case 'RATE_LIMIT':
        diagnosis.recommendations.push({
          type: 'warning',
          title: 'API调用频率超限',
          description: 'API调用频率超限',
          action: '建议降低调用频率或等待一段时间后重试'
        });
        break;
      case 'AUTHENTICATION_ERROR':
        diagnosis.recommendations.push({
          type: 'critical',
          title: '认证错误',
          description: 'API密钥无效或已过期',
          action: '建议检查API密钥配置'
        });
        break;
      default:
        diagnosis.recommendations.push({
          type: 'info',
          title: '未知错误',
          description: '未知错误类型，需要进一步诊断',
          action: '建议查看详细日志或联系技术支持'
        });
    }

    // 记录诊断信息
    Logger.error('错误诊断', {
      errorType: diagnosis.errorType,
      errorMessage: diagnosis.errorMessage,
      errorCode: diagnosis.errorCode,
      context: context,
      recommendations: diagnosis.recommendations
    });

    return diagnosis;
  }

  /**
   * 错误分类
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   */
  classifyError(error) {
    if (error.code === 'ECONNRESET') return 'CONNECTION_RESET';
    if (error.code === 'ENOTFOUND') return 'DNS_ERROR';
    if (error.code === 'ETIMEDOUT') return 'TIMEOUT';
    if (error.code === 'ECONNREFUSED') return 'CONNECTION_REFUSED';
    if (error.code === 'ENETUNREACH') return 'NETWORK_UNREACHABLE';
    if (error.code === 'ECONNABORTED') return 'CONNECTION_ABORTED';
    
    if (error.response) {
      const status = error.response.status;
      if (status === 429) return 'RATE_LIMIT';
      if (status === 401) return 'AUTHENTICATION_ERROR';
      if (status === 403) return 'AUTHORIZATION_ERROR';
      if (status === 404) return 'NOT_FOUND';
      if (status >= 500) return 'SERVER_ERROR';
      if (status >= 400) return 'CLIENT_ERROR';
    }
    
    if (error.message.includes('timeout')) return 'TIMEOUT';
    if (error.message.includes('network')) return 'NETWORK_ERROR';
    if (error.message.includes('connection')) return 'CONNECTION_ERROR';
    
    return 'UNKNOWN_ERROR';
  }
}

// 创建单例实例
const networkDiagnostic = new NetworkDiagnostic();

module.exports = networkDiagnostic; 