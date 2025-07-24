/**
 * 网络诊断工具
 * 用于诊断API连接问题
 */

const https = require('https');
const dns = require('dns');
const Logger = require('./logger');

class NetworkDiagnostic {
  /**
   * 测试到指定URL的连接
   * @param {string} url - 要测试的URL
   * @returns {Promise<object>} 测试结果
   */
  static async testConnection(url) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: 'Connection timeout',
          duration: Date.now() - startTime
        });
      }, 10000);

      const req = https.get(url, (res) => {
        clearTimeout(timeout);
        resolve({
          success: true,
          statusCode: res.statusCode,
          headers: res.headers,
          duration: Date.now() - startTime
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: error.message,
          code: error.code,
          duration: Date.now() - startTime
        });
      });

      req.setTimeout(10000, () => {
        clearTimeout(timeout);
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout',
          duration: Date.now() - startTime
        });
      });
    });
  }

  /**
   * 测试DNS解析
   * @param {string} hostname - 主机名
   * @returns {Promise<object>} DNS解析结果
   */
  static async testDNS(hostname) {
    return new Promise((resolve) => {
      dns.resolve4(hostname, (err, addresses) => {
        if (err) {
          resolve({
            success: false,
            error: err.message,
            code: err.code
          });
        } else {
          resolve({
            success: true,
            addresses: addresses
          });
        }
      });
    });
  }

  /**
   * 完整的网络诊断
   * @param {string} apiUrl - API URL
   * @returns {Promise<object>} 诊断结果
   */
  static async diagnoseNetwork(apiUrl) {
    const url = new URL(apiUrl);
    const hostname = url.hostname;
    
    Logger.info('开始网络诊断', { apiUrl, hostname });
    
    const results = {
      timestamp: new Date().toISOString(),
      apiUrl: apiUrl,
      hostname: hostname,
      dns: null,
      connection: null,
      recommendations: []
    };

    // 测试DNS解析
    results.dns = await this.testDNS(hostname);
    if (!results.dns.success) {
      results.recommendations.push('DNS解析失败，请检查网络设置');
    }

    // 测试连接
    results.connection = await this.testConnection(apiUrl);
    if (!results.connection.success) {
      results.recommendations.push('API连接失败，可能是网络问题或防火墙阻止');
    }

    // 分析结果
    if (results.connection.success && results.dns.success) {
      results.status = 'healthy';
      Logger.success('网络诊断完成 - 连接正常');
    } else {
      results.status = 'unhealthy';
      Logger.warn('网络诊断完成 - 发现问题', { 
        dnsSuccess: results.dns.success,
        connectionSuccess: results.connection.success 
      });
    }

    return results;
  }

  /**
   * 获取网络状态报告
   * @returns {Promise<object>} 网络状态报告
   */
  static async getNetworkStatus() {
    const apiUrl = 'https://api.deepseek.com/chat/completions';
    const diagnosis = await this.diagnoseNetwork(apiUrl);
    
    return {
      status: diagnosis.status,
      timestamp: diagnosis.timestamp,
      apiUrl: diagnosis.apiUrl,
      dns: {
        success: diagnosis.dns.success,
        addresses: diagnosis.dns.addresses || []
      },
      connection: {
        success: diagnosis.connection.success,
        statusCode: diagnosis.connection.statusCode,
        duration: diagnosis.connection.duration
      },
      recommendations: diagnosis.recommendations
    };
  }
}

module.exports = NetworkDiagnostic; 